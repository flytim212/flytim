import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BENCHMARK_STATUSES } from '@/lib/constants'

type Params = { params: { id: string } }

// 对标详情
export async function GET(_request: Request, { params }: Params) {
  const benchmark = await prisma.benchmark.findUnique({
    where: { id: Number(params.id) },
  })
  if (!benchmark) return NextResponse.json({ error: '对标不存在' }, { status: 404 })
  return NextResponse.json(benchmark)
}

// 更新对标（补拆解 / 改状态）
export async function PATCH(request: Request, { params }: Params) {
  const id = Number(params.id)
  const data = await request.json().catch(() => ({}))

  const cur = await prisma.benchmark.findUnique({ where: { id } })
  if (!cur) return NextResponse.json({ error: '对标不存在' }, { status: 404 })

  const update: Record<string, string | number> = {}
  for (const k of [
    'url',
    'author',
    'fans',
    'title',
    'publishedAt',
    'opening',
    'argument',
    'ending',
    'whyHit',
    'audience',
    'demand',
    'painPoint',
    'solution',
  ] as const) {
    if (typeof data[k] === 'string') update[k] = (data[k] as string).trim()
  }
  for (const k of ['views', 'likes', 'comments', 'saves', 'shares'] as const) {
    if (data[k] !== undefined) {
      const s = String(data[k]).replace(/[,，\s]/g, '')
      const m = s.match(/^(\d+(?:\.\d+)?)(万|w|W)?$/)
      update[k] = m ? Math.round(Number(m[1]) * (m[2] ? 1e4 : 1)) : 0
    }
  }
  if (
    typeof data.status === 'string' &&
    (BENCHMARK_STATUSES as readonly string[]).includes(data.status)
  ) {
    update.status = data.status
  }

  const benchmark = await prisma.benchmark.update({ where: { id }, data: update })
  return NextResponse.json(benchmark)
}

export async function DELETE(_request: Request, { params }: Params) {
  const id = Number(params.id)
  // 解除关联此对标的选题
  await prisma.topic.updateMany({ where: { linkedBenchmarkId: id }, data: { linkedBenchmarkId: null } })
  await prisma.benchmark.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
