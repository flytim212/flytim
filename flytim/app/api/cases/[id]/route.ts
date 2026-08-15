import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EMOTION_TYPES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function PATCH(request: Request, { params }: Params) {
  const data = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = {}

  for (const key of ['trigger', 'bodySignal', 'action', 'result'] as const) {
    if (typeof data[key] === 'string') update[key] = data[key].trim()
  }
  if (
    typeof data.emotionType === 'string' &&
    (EMOTION_TYPES as readonly string[]).includes(data.emotionType)
  ) {
    update.emotionType = data.emotionType
  }
  if (typeof data.usableAsTopic === 'boolean') update.usableAsTopic = data.usableAsTopic
  if (
    typeof data.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.date)
  ) {
    update.date = new Date(`${data.date}T00:00:00.000Z`)
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 })
  }

  const c = await prisma.case
    .update({ where: { id: Number(params.id) }, data: update })
    .catch(() => null)
  if (!c) return NextResponse.json({ error: '案例不存在' }, { status: 404 })
  return NextResponse.json(c)
}

export async function DELETE(_request: Request, { params }: Params) {
  await prisma.case.delete({ where: { id: Number(params.id) } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
