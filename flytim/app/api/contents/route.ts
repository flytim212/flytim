import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 文案列表（日历 / 汇总用，带选题标题与分类）
export async function GET() {
  const contents = await prisma.content.findMany({
    include: { topic: { select: { id: true, title: true, category: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(contents)
}

// 从选题进入写稿：获取或创建该选题的文案（一对一），返回可直接跳转编辑器
export async function POST(request: Request) {
  const data = await request.json().catch(() => ({}))
  const topicId = Number(data.topicId)
  if (!topicId) {
    return NextResponse.json({ error: '缺少 topicId' }, { status: 400 })
  }

  const existing = await prisma.content.findUnique({ where: { topicId } })
  if (existing) return NextResponse.json(existing)

  const topic = await prisma.topic.findUnique({ where: { id: topicId } })
  if (!topic) return NextResponse.json({ error: '选题不存在' }, { status: 404 })

  const content = await prisma.content.create({ data: { topicId } })
  // 选题状态：待写 → 已写稿
  if (topic.status === '待写') {
    await prisma.topic.update({ where: { id: topicId }, data: { status: '已写稿' } })
  }
  return NextResponse.json(content, { status: 201 })
}
