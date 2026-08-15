import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function PATCH(request: Request, { params }: Params) {
  const data = await request.json().catch(() => ({}))
  const update: Record<string, string> = {}

  if (typeof data.course === 'string' && data.course.trim()) update.course = data.course.trim()
  if (typeof data.episode === 'string') update.episode = data.episode.trim()
  if (typeof data.content === 'string') update.content = data.content

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 })
  }

  const note = await prisma.note
    .update({ where: { id: Number(params.id) }, data: update })
    .catch(() => null)
  if (!note) return NextResponse.json({ error: '笔记不存在' }, { status: 404 })
  return NextResponse.json(note)
}

export async function DELETE(_request: Request, { params }: Params) {
  await prisma.note.delete({ where: { id: Number(params.id) } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
