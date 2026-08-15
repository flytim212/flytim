import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CATEGORIES, TOPIC_STATUSES } from '@/lib/constants'

type Params = { params: { id: string } }

// 编辑选题
export async function PATCH(request: Request, { params }: Params) {
  const id = Number(params.id)
  const data = await request.json().catch(() => ({}))

  const update: {
    title?: string
    hook?: string
    category?: string
    status?: string
    audience?: string
    demand?: string
    painPoint?: string
    solution?: string
  } = {}
  if (typeof data.title === 'string') {
    const title = data.title.trim()
    if (!title) return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
    update.title = title
  }
  if (typeof data.hook === 'string') update.hook = data.hook.trim()
  if (typeof data.category === 'string' && (CATEGORIES as readonly string[]).includes(data.category)) {
    update.category = data.category
  }
  if (typeof data.status === 'string' && (TOPIC_STATUSES as readonly string[]).includes(data.status)) {
    update.status = data.status
  }
  for (const k of ['audience', 'demand', 'painPoint', 'solution'] as const) {
    if (typeof data[k] === 'string') update[k] = (data[k] as string).trim()
  }

  const topic = await prisma.topic.update({ where: { id }, data: update })
  return NextResponse.json(topic)
}

// 删除选题（级联删除其文案）
export async function DELETE(_request: Request, { params }: Params) {
  await prisma.topic.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
