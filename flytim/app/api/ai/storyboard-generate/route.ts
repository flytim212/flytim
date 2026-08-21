import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { chatCompletion, getAiConfig } from '@/lib/ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// 生成提示词：抖音精选视频专属脚本 + 分镜 + seedance 图片提示词
const PROMPT = `你是抖音精选视频的资深编导。根据选题题目和核心观点，生成一条竖屏口播视频的完整分镜脚本。

要求：
1. 总时长 60~75 秒，切 6~8 个分镜，每镜 6~14 秒；
2. 口播文案（narration）要口语化、有钩子：第一镜前 3 秒必须抛出冲突或结论，最后一镜是互动提问；每镜口播字数 ≈ 该镜秒数 × 4.5；
3. 整体思路（overall）：3~5 句话讲清这条视频怎么起、怎么落，为什么这样设计；
4. 每镜的 imagePrompt 是给图片/视频生成模型（Seedance）的提示词：中文，描述画面主体、动作、构图、景别、光线与色调，适配 9:16 竖屏，风格统一为真实感生活摄影/微电影质感，人物用「一个30多岁的中国男人/女人」这类泛指，不要出现具体明星姓名，不要出现文字与字幕；
5. sceneDesc 是给剪辑师看的画面说明，一句话即可。

只输出一个 JSON 对象，不要输出任何其他文字或代码块标记：
{"overall":"整体思路","shots":[{"startSec":0,"endSec":9,"narration":"口播文案","sceneDesc":"画面说明","imagePrompt":"seedance 提示词"}]}`

type AiShot = {
  startSec?: unknown
  endSec?: unknown
  narration?: unknown
  sceneDesc?: unknown
  imagePrompt?: unknown
}

// POST {title, viewpoint, topicId?} → 调文本 AI 生成分镜脚本并入库
export async function POST(request: Request) {
  const cfg = await getAiConfig()
  if (!cfg.apiKey) {
    return NextResponse.json(
      { error: '还没配置 AI 服务，先到「设置」页填写 API Key' },
      { status: 400 },
    )
  }

  const data = await request.json().catch(() => ({}))
  const title = typeof data.title === 'string' ? data.title.trim() : ''
  const viewpoint = typeof data.viewpoint === 'string' ? data.viewpoint.trim() : ''
  if (!title) return NextResponse.json({ error: '题目不能为空' }, { status: 400 })
  if (!viewpoint) return NextResponse.json({ error: '核心观点不能为空' }, { status: 400 })

  // 先建记录（脚本生成中）
  const storyboard = await prisma.storyboard.create({
    data: {
      title,
      viewpoint,
      topicId: Number.isInteger(data.topicId) && data.topicId > 0 ? data.topicId : null,
      status: '脚本生成中',
    },
  })

  const r = await chatCompletion(cfg, {
    messages: [
      {
        role: 'user',
        content: `选题题目：${title}\n核心观点：${viewpoint}\n\n${PROMPT}`,
      },
    ],
    temperature: 0.7,
  })

  if (!r.ok) {
    await prisma.storyboard.update({
      where: { id: storyboard.id },
      data: { status: '失败', error: r.error },
    })
    return NextResponse.json({ error: r.error, storyboardId: storyboard.id }, { status: 502 })
  }

  // 从回复里抠 JSON（容忍 ```json 包裹与前后闲话）
  const m = r.content.match(/\{[\s\S]*\}/)
  let parsed: { overall?: unknown; shots?: AiShot[] }
  try {
    parsed = m ? JSON.parse(m[0]) : {}
  } catch {
    const error = `AI 没返回合法 JSON：${r.content.slice(0, 150)}`
    await prisma.storyboard.update({
      where: { id: storyboard.id },
      data: { status: '失败', error },
    })
    return NextResponse.json({ error, storyboardId: storyboard.id }, { status: 502 })
  }

  const shots = Array.isArray(parsed.shots) ? parsed.shots : []
  const valid = shots
    .filter((s) => typeof s.narration === 'string' && (s.narration as string).trim())
    .map((s, i) => ({
      storyboardId: storyboard.id,
      order: i + 1,
      startSec: Math.max(0, Math.round(Number(s.startSec) || 0)),
      endSec: Math.max(0, Math.round(Number(s.endSec) || 0)),
      narration: String(s.narration ?? '').trim(),
      sceneDesc: String(s.sceneDesc ?? '').trim(),
      imagePrompt: String(s.imagePrompt ?? '').trim(),
    }))

  if (valid.length === 0) {
    const error = 'AI 没生成有效分镜，换个说法再试'
    await prisma.storyboard.update({
      where: { id: storyboard.id },
      data: { status: '失败', error },
    })
    return NextResponse.json({ error, storyboardId: storyboard.id }, { status: 502 })
  }

  const duration = valid[valid.length - 1].endSec
  await prisma.$transaction([
    prisma.shot.createMany({ data: valid }),
    prisma.storyboard.update({
      where: { id: storyboard.id },
      data: {
        overall: String(parsed.overall ?? '').trim(),
        duration,
        status: '脚本就绪',
        error: '',
      },
    }),
  ])

  const full = await prisma.storyboard.findUnique({
    where: { id: storyboard.id },
    include: { shots: { orderBy: { order: 'asc' } } },
  })
  return NextResponse.json(full, { status: 201 })
}
