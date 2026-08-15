import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseMetricPayload } from '@/lib/metric-input'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

const INCLUDE = {
  content: { select: { id: true, topic: { select: { id: true, title: true, category: true, status: true } } } },
}

// 修改记录（主要用于编辑迭代备注）
export async function PATCH(request: Request, { params }: Params) {
  const data = await request.json().catch(() => ({}))
  const parsed = parseMetricPayload(data, false)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  // 本接口不修改归属/平台/日期，只改数值与备注
  const rest = { ...parsed.value }
  delete rest.contentId
  delete rest.platform
  delete rest.date
  const metric = await prisma.metric
    .update({ where: { id: Number(params.id) }, data: rest, include: INCLUDE })
    .catch(() => null)
  if (!metric) return NextResponse.json({ error: '记录不存在' }, { status: 404 })
  return NextResponse.json(metric)
}

// 删除记录
export async function DELETE(_request: Request, { params }: Params) {
  await prisma.metric.delete({ where: { id: Number(params.id) } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
