import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateImage, getAiConfig } from '@/lib/ai'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type Params = { params: { id: string; shotId: string } }

const IMG_DIR = path.join(process.cwd(), '.data', 'storyboards')

// 生成单个分镜的图片：POST（body 可带 {prompt} 覆盖提示词）
export async function POST(request: Request, { params }: Params) {
  const cfg = await getAiConfig()
  if (!cfg.apiKey) {
    return NextResponse.json(
      { error: '还没配置 AI 服务，先到「设置」页填写 API Key 和图片模型' },
      { status: 400 },
    )
  }

  const shot = await prisma.shot.findUnique({
    where: { id: Number(params.shotId) },
    include: { storyboard: true },
  })
  if (!shot || shot.storyboardId !== Number(params.id)) {
    return NextResponse.json({ error: '分镜不存在' }, { status: 404 })
  }

  const data = await request.json().catch(() => ({}))
  const prompt =
    typeof data.prompt === 'string' && data.prompt.trim()
      ? data.prompt.trim()
      : shot.imagePrompt
  if (!prompt) {
    return NextResponse.json({ error: '该分镜没有 seedance 提示词' }, { status: 400 })
  }

  await prisma.shot.update({
    where: { id: shot.id },
    data: { imageStatus: '生成中', imageError: '' },
  })

  const r = await generateImage(cfg, prompt)
  if (!r.ok) {
    await prisma.shot.update({
      where: { id: shot.id },
      data: { imageStatus: '失败', imageError: r.error },
    })
    return NextResponse.json({ error: r.error }, { status: 502 })
  }

  await mkdir(IMG_DIR, { recursive: true })
  const filename = `sb${shot.storyboardId}-shot${shot.id}-${Date.now()}.${r.ext}`
  await writeFile(path.join(IMG_DIR, filename), r.buffer)

  const updated = await prisma.shot.update({
    where: { id: shot.id },
    data: { imageUrl: `/api/storyboard-images/${filename}`, imageStatus: '已生成' },
  })

  // 全部生成完 → 状态置「完成」
  const siblings = await prisma.shot.findMany({
    where: { storyboardId: shot.storyboardId },
    select: { imageStatus: true },
  })
  if (siblings.every((s) => s.imageStatus === '已生成')) {
    await prisma.storyboard.update({
      where: { id: shot.storyboardId },
      data: { status: '完成' },
    })
  }

  return NextResponse.json(updated)
}
