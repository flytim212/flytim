import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SOURCE_STATUSES, SOURCE_TYPES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function PATCH(request: Request, { params }: Params) {
  const data = await request.json().catch(() => ({}))
  const update: Record<string, string> = {}

  for (const key of ['title', 'author', 'url', 'description', 'tags', 'notes'] as const) {
    if (typeof data[key] === 'string') update[key] = data[key].trim()
  }
  if (typeof data.type === 'string' && (SOURCE_TYPES as readonly string[]).includes(data.type)) {
    update.type = data.type
  }
  if (
    typeof data.status === 'string' &&
    (SOURCE_STATUSES as readonly string[]).includes(data.status)
  ) {
    update.status = data.status
  }
  if ('title' in update && !update.title) {
    return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
  }

  const source = await prisma.source
    .update({ where: { id: Number(params.id) }, data: update })
    .catch(() => null)
  if (!source) return NextResponse.json({ error: '资源不存在' }, { status: 404 })
  return NextResponse.json(source)
}

export async function DELETE(_request: Request, { params }: Params) {
  await prisma.source.delete({ where: { id: Number(params.id) } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
