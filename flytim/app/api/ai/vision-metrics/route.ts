import { NextResponse } from 'next/server'
import { chatCompletion, getAiConfig } from '@/lib/ai'
import type { MetricNums } from '@/lib/metric-paste'

export const dynamic = 'force-dynamic'

// 让视觉模型从创作者后台截图里读数据 → 结构化字段
// POST {image: dataURL 或纯 base64}
const PROMPT = `这是短视频/自媒体创作者后台的数据截图。请读出以下字段，只输出一个 JSON 对象，不要输出任何其他文字：
{"views":播放量,"completion3s":3秒完播率(百分号前的数字),"completionFull":整体完播率(百分号前的数字),"likes":点赞,"comments":评论,"saves":收藏,"shares":转发或分享,"newFans":涨粉或新增粉丝}
截图里没有的字段填 null，不要猜。`

const FIELDS: (keyof MetricNums)[] = [
  'views',
  'completion3s',
  'completionFull',
  'likes',
  'comments',
  'saves',
  'shares',
  'newFans',
]

export async function POST(request: Request) {
  const cfg = await getAiConfig()
  if (!cfg.apiKey) {
    return NextResponse.json(
      { error: '还没配置 AI 服务，先到「设置」页填写 API Key' },
      { status: 400 },
    )
  }

  const data = await request.json().catch(() => ({}))
  const image = typeof data.image === 'string' ? data.image : ''
  if (!image) {
    return NextResponse.json({ error: '缺少 image 字段（dataURL 或 base64）' }, { status: 400 })
  }
  const url = image.startsWith('data:') ? image : `data:image/png;base64,${image}`

  const r = await chatCompletion(cfg, {
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url } },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
    temperature: 0.1,
  })
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 })

  // 从回复里抠 JSON（容忍 ```json 包裹）
  const m = r.content.match(/\{[\s\S]*?\}/)
  if (!m) {
    return NextResponse.json(
      { error: `AI 没返回合法 JSON：${r.content.slice(0, 120)}` },
      { status: 502 },
    )
  }
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(m[0])
  } catch {
    return NextResponse.json({ error: `JSON 解析失败：${m[0].slice(0, 120)}` }, { status: 502 })
  }

  const values: MetricNums = {}
  const matched: string[] = []
  for (const f of FIELDS) {
    const v = parsed[f]
    if (typeof v === 'number' && Number.isFinite(v)) {
      values[f] = Math.round(v * 10) / 10
      matched.push(`${f} ${values[f]}`)
    }
  }
  if (matched.length === 0) {
    return NextResponse.json(
      { error: '截图里没读到有效数据，换一张清晰点的试试' },
      { status: 422 },
    )
  }
  return NextResponse.json({ values, matched, raw: r.content.slice(0, 500) })
}
