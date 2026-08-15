import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function PATCH(request: Request, { params }: Params) {
  const data = await request.json().catch(() => ({}))
  const update: Record<string, string> = {}
  if (typeof data.text === 'string' && data.text.trim()) update.text = data.text.trim()
  if (typeof data.source === 'string') update.source = data.source.trim()

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 })
  }

  const quote = await prisma.quote
    .update({ where: { id: Number(params.id) }, data: update })
    .catch(() => null)
  if (!quote) return NextResponse.json({ error: '金句不存在' }, { status: 404 })
  return NextResponse.json(quote)
}

export async function DELETE(_request: Request, { params }: Params) {
  await prisma.quote.delete({ where: { id: Number(params.id) } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
