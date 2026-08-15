import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CARD_STATUSES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

type CardInput = {
  title?: string
  oneLiner?: string
  source?: string
  keyPoints?: string
  myExperience?: string
  scriptDraft?: string
  status?: string
}

function clean(input: CardInput) {
  return {
    title: String(input.title ?? '').trim(),
    oneLiner: String(input.oneLiner ?? '').trim(),
    source: String(input.source ?? '').trim(),
    keyPoints: String(input.keyPoints ?? '').trim(),
    myExperience: String(input.myExperience ?? '').trim(),
    scriptDraft: String(input.scriptDraft ?? '').trim(),
    status: (CARD_STATUSES as readonly string[]).includes(String(input.status))
      ? String(input.status)
      : '待补经历',
  }
}

// 概念卡列表（?status=&q=）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const q = searchParams.get('q')?.trim()

  const cards = await prisma.card.findMany({
    where: {
      ...(status && status !== '全部' ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { oneLiner: { contains: q } },
              { keyPoints: { contains: q } },
              { myExperience: { contains: q } },
              { scriptDraft: { contains: q } },
              { source: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(cards)
}

export async function POST(request: Request) {
  const data = await request.json().catch(() => ({}))

  if (Array.isArray(data.items) && data.items.length > 0) {
    const rows = (data.items as CardInput[]).map(clean).filter((r) => r.title)
    if (rows.length === 0) {
      return NextResponse.json({ error: '没有合法条目（title 必填）' }, { status: 400 })
    }
    const result = await prisma.card.createMany({ data: rows })
    return NextResponse.json({ created: result.count }, { status: 201 })
  }

  const row = clean(data)
  if (!row.title) return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
  const card = await prisma.card.create({ data: row })
  return NextResponse.json(card, { status: 201 })
}
