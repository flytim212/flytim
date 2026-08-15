import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseMetricPayload } from '@/lib/metric-input'

export const dynamic = 'force-dynamic'

// 数据记录列表（带内容标题与分类，供趋势/分析/日志使用）
export async function GET() {
  const metrics = await prisma.metric.findMany({
    include: {
      content: { select: { id: true, topic: { select: { id: true, title: true, category: true, status: true } } } },
    },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
  })
  return NextResponse.json(metrics)
}

// 录入一条数据
export async function POST(request: Request) {
  const data = await request.json().catch(() => ({}))
  const parsed = parseMetricPayload(data, true)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { contentId, platform, date, ...rest } = parsed.value

  const content = await prisma.content.findUnique({ where: { id: contentId! } })
  if (!content) return NextResponse.json({ error: '内容不存在' }, { status: 404 })

  const metric = await prisma.metric.create({
    data: {
      contentId: contentId!,
      platform: platform!,
      date: new Date(date!),
      ...rest,
    },
    include: {
      content: { select: { id: true, topic: { select: { id: true, title: true, category: true, status: true } } } },
    },
  })
  return NextResponse.json(metric, { status: 201 })
}
