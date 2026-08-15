import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SOURCE_STATUSES, SOURCE_TYPES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

type SourceInput = {
  type?: string
  title?: string
  author?: string
  url?: string
  description?: string
  status?: string
  tags?: string
  notes?: string
}

function clean(input: SourceInput) {
  const type = (SOURCE_TYPES as readonly string[]).includes(String(input.type))
    ? String(input.type)
    : '书籍'
  const status = (SOURCE_STATUSES as readonly string[]).includes(String(input.status))
    ? String(input.status)
    : '待处理'
  return {
    type,
    status,
    title: String(input.title ?? '').trim(),
    author: String(input.author ?? '').trim(),
    url: String(input.url ?? '').trim(),
    description: String(input.description ?? '').trim(),
    tags: String(input.tags ?? '').trim(),
    notes: String(input.notes ?? '').trim(),
  }
}

// 资源列表（?type=书籍&status=进行中&q=关键词）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const q = searchParams.get('q')?.trim()

  const sources = await prisma.source.findMany({
    where: {
      ...(type && type !== '全部' ? { type } : {}),
      ...(status && status !== '全部' ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { author: { contains: q } },
              { tags: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(sources)
}

// 导入资源：单条 {title,...} 或批量 {items:[...]}
export async function POST(request: Request) {
  const data = await request.json().catch(() => ({}))

  // 批量
  if (Array.isArray(data.items) && data.items.length > 0) {
    const rows = (data.items as SourceInput[])
      .map(clean)
      .filter((r) => r.title)
    if (rows.length === 0) {
      return NextResponse.json({ error: '没有合法条目（title 必填）' }, { status: 400 })
    }
    const result = await prisma.source.createMany({ data: rows })
    return NextResponse.json({ created: result.count }, { status: 201 })
  }

  // 单条
  const row = clean(data)
  if (!row.title) {
    return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
  }
  const source = await prisma.source.create({ data: row })
  return NextResponse.json(source, { status: 201 })
}
