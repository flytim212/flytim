import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CARD_STATUSES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function GET(_request: Request, { params }: Params) {
  const id = Number(params.id)
  const card = await prisma.card.findUnique({ where: { id } })
  if (!card) return NextResponse.json({ error: '概念卡不存在' }, { status: 404 })
  // 关联的选题
  const topics = await prisma.topic.findMany({
    where: { linkedCardId: id },
    select: { id: true, title: true, status: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ ...card, topics })
}

export async function PATCH(request: Request, { params }: Params) {
  const data = await request.json().catch(() => ({}))
  const update: Record<string, string> = {}

  for (const key of [
    'title',
    'oneLiner',
    'source',
    'keyPoints',
    'myExperience',
    'scriptDraft',
  ] as const) {
    if (typeof data[key] === 'string') update[key] = data[key]
  }
  if (
    typeof data.status === 'string' &&
    (CARD_STATUSES as readonly string[]).includes(data.status)
  ) {
    update.status = data.status
  }
  if ('title' in update && !update.title.trim()) {
    return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
  }

  const card = await prisma.card
    .update({ where: { id: Number(params.id) }, data: update })
    .catch(() => null)
  if (!card) return NextResponse.json({ error: '概念卡不存在' }, { status: 404 })
  return NextResponse.json(card)
}

export async function DELETE(_request: Request, { params }: Params) {
  const id = Number(params.id)
  // 解除选题关联后删除
  await prisma.topic.updateMany({ where: { linkedCardId: id }, data: { linkedCardId: null } })
  await prisma.card.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
