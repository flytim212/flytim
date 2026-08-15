import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 金句列表（?q= 搜索）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  const quotes = await prisma.quote.findMany({
    where: q
      ? { OR: [{ text: { contains: q } }, { source: { contains: q } }] }
      : {},
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(quotes)
}

export async function POST(request: Request) {
  const data = await request.json().catch(() => ({}))

  if (Array.isArray(data.items) && data.items.length > 0) {
    const rows = (data.items as { text?: string; source?: string }[])
      .map((i) => ({
        text: String(i.text ?? '').trim(),
        source: String(i.source ?? '').trim(),
      }))
      .filter((r) => r.text)
    if (rows.length === 0) {
      return NextResponse.json({ error: '没有合法条目（text 必填）' }, { status: 400 })
    }
    const result = await prisma.quote.createMany({ data: rows })
    return NextResponse.json({ created: result.count }, { status: 201 })
  }

  const text = String(data.text ?? '').trim()
  if (!text) return NextResponse.json({ error: '内容不能为空' }, { status: 400 })
  const quote = await prisma.quote.create({
    data: { text, source: String(data.source ?? '').trim() },
  })
  return NextResponse.json(quote, { status: 201 })
}
