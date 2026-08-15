import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BENCHMARK_STATUSES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

type BenchInput = {
  url?: string
  author?: string
  fans?: string
  title?: string
  publishedAt?: string
  views?: number | string
  likes?: number | string
  comments?: number | string
  saves?: number | string
  shares?: number | string
  opening?: string
  argument?: string
  ending?: string
  whyHit?: string
  audience?: string
  demand?: string
  painPoint?: string
  solution?: string
  status?: string
}

// "1.2万" "3,456" 765 → 数字；不合法返回 0
function toInt(v: unknown): number {
  const s = String(v ?? '').replace(/[,，\s]/g, '')
  const m = s.match(/^(\d+(?:\.\d+)?)(万|w|W)?$/)
  if (!m) return 0
  let n = Number(m[1])
  if (m[2]) n *= 1e4
  return Math.round(n)
}

function clean(input: BenchInput) {
  const hasDig = Boolean(
    (input.opening ?? '').trim() || (input.argument ?? '').trim() || (input.ending ?? '').trim(),
  )
  const asked = String(input.status ?? '')
  const status = (BENCHMARK_STATUSES as readonly string[]).includes(asked)
    ? asked
    : hasDig
      ? '已拆解'
      : '待拆解'
  return {
    url: String(input.url ?? '').trim(),
    author: String(input.author ?? '').trim(),
    fans: String(input.fans ?? '').trim(),
    title: String(input.title ?? '').trim(),
    publishedAt: String(input.publishedAt ?? '').trim(),
    views: toInt(input.views),
    likes: toInt(input.likes),
    comments: toInt(input.comments),
    saves: toInt(input.saves),
    shares: toInt(input.shares),
    opening: String(input.opening ?? '').trim(),
    argument: String(input.argument ?? '').trim(),
    ending: String(input.ending ?? '').trim(),
    whyHit: String(input.whyHit ?? '').trim(),
    audience: String(input.audience ?? '').trim(),
    demand: String(input.demand ?? '').trim(),
    painPoint: String(input.painPoint ?? '').trim(),
    solution: String(input.solution ?? '').trim(),
    status,
  }
}

// 对标列表（?status=&q= 按状态/关键词筛选，默认按点赞数降序——爆款优先）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const q = searchParams.get('q')?.trim()

  const benchmarks = await prisma.benchmark.findMany({
    where: {
      ...(status && status !== '全部' ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { author: { contains: q } },
              { opening: { contains: q } },
              { argument: { contains: q } },
              { whyHit: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { likes: 'desc' },
  })
  return NextResponse.json(benchmarks)
}

// 收集爆款：单条 {title,...} 或批量 {items:[...]}
export async function POST(request: Request) {
  const data = await request.json().catch(() => ({}))

  if (Array.isArray(data.items) && data.items.length > 0) {
    const rows = (data.items as BenchInput[]).map(clean).filter((r) => r.title)
    if (rows.length === 0) {
      return NextResponse.json({ error: '没有合法条目（title 必填）' }, { status: 400 })
    }
    const result = await prisma.benchmark.createMany({ data: rows })
    return NextResponse.json({ created: result.count }, { status: 201 })
  }

  const row = clean(data)
  if (!row.title) {
    return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
  }
  const benchmark = await prisma.benchmark.create({ data: row })
  return NextResponse.json(benchmark, { status: 201 })
}
