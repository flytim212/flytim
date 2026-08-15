import { NextResponse } from 'next/server'
import { parseMetricsText } from '@/lib/metric-paste'

export const dynamic = 'force-dynamic'

// AI 接入：把自然语言/后台复制的账号数据解析成结构化字段
// POST {text} → {values, matched}
export async function POST(request: Request) {
  const data = await request.json().catch(() => ({}))
  const text = typeof data.text === 'string' ? data.text : ''
  if (!text.trim()) {
    return NextResponse.json(
      {
        error: '缺少 text 字段',
        example: '{"text":"播放量 1.2万 点赞 356 3秒完播率 25.3%"}',
      },
      { status: 400 },
    )
  }
  return NextResponse.json(parseMetricsText(text))
}
