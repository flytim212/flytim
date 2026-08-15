import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CHARS_PER_SECOND, CONTENT_STATUSES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

// 'YYYY-MM-DD' → UTC 零点 Date；null → 清空；其他 → 不更新
function parseDate(value: unknown): Date | null | undefined {
  if (value === null) return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`)
  }
  return undefined
}

// 文案详情（含选题）
export async function GET(_request: Request, { params }: Params) {
  const content = await prisma.content.findUnique({
    where: { id: Number(params.id) },
    include: { topic: true },
  })
  if (!content) return NextResponse.json({ error: '文案不存在' }, { status: 404 })
  return NextResponse.json(content)
}

// 保存文案（正文/状态/计划日/发布日），自动同步字数、时长与选题状态
export async function PATCH(request: Request, { params }: Params) {
  const id = Number(params.id)
  const data = await request.json().catch(() => ({}))

  const update: {
    body?: string
    wordCount?: number
    durationEst?: number
    status?: string
    plannedDate?: Date | null
    publishedDate?: Date | null
  } = {}

  if (typeof data.body === 'string') {
    const wordCount = data.body.replace(/\s+/g, '').length
    update.body = data.body
    update.wordCount = wordCount
    update.durationEst = Math.round(wordCount / CHARS_PER_SECOND)
  }
  if (typeof data.status === 'string' && (CONTENT_STATUSES as readonly string[]).includes(data.status)) {
    update.status = data.status
  }
  const plannedDate = parseDate(data.plannedDate)
  if (plannedDate !== undefined) update.plannedDate = plannedDate
  const publishedDate = parseDate(data.publishedDate)
  if (publishedDate !== undefined) update.publishedDate = publishedDate

  const content = await prisma.content.update({ where: { id }, data: update })

  // 同步选题状态：已发布 > 已写稿 > 待写（「已废弃」不覆盖）
  let topic = await prisma.topic.findUnique({ where: { id: content.topicId } })
  if (topic && topic.status !== '已废弃') {
    const next = content.publishedDate ? '已发布' : content.body.trim() ? '已写稿' : '待写'
    if (next !== topic.status) {
      topic = await prisma.topic.update({ where: { id: topic.id }, data: { status: next } })
    }
  }

  return NextResponse.json({ ...content, topic })
}

// 删除文案（选题回到待写，仅当原本是已写稿）
export async function DELETE(_request: Request, { params }: Params) {
  const id = Number(params.id)
  const content = await prisma.content.delete({ where: { id } }).catch(() => null)
  if (content) {
    await prisma.topic.updateMany({
      where: { id: content.topicId, status: '已写稿' },
      data: { status: '待写' },
    })
  }
  return NextResponse.json({ ok: true })
}
