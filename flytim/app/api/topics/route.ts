import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CATEGORIES, TOPIC_STATUSES } from '@/lib/constants'

// 选题列表（支持 ?category=故事&status=待写 筛选）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const status = searchParams.get('status')

  const topics = await prisma.topic.findMany({
    where: {
      ...(category && category !== '全部' ? { category } : {}),
      ...(status && status !== '全部' ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(topics)
}

// 新建选题（支持 linkedCardId：由概念卡「转为选题」创建）
export async function POST(request: Request) {
  const data = await request.json().catch(() => ({}))
  const title = typeof data.title === 'string' ? data.title.trim() : ''
  if (!title) {
    return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
  }
  const linkedCardId =
    Number.isInteger(data.linkedCardId) && (data.linkedCardId as number) > 0
      ? (data.linkedCardId as number)
      : null
  const linkedBenchmarkId =
    Number.isInteger(data.linkedBenchmarkId) && (data.linkedBenchmarkId as number) > 0
      ? (data.linkedBenchmarkId as number)
      : null

  const topic = await prisma.topic.create({
    data: {
      title,
      hook: typeof data.hook === 'string' ? data.hook.trim() : '',
      category: (CATEGORIES as readonly string[]).includes(data.category) ? data.category : '故事',
      status: (TOPIC_STATUSES as readonly string[]).includes(data.status) ? data.status : '待写',
      linkedCardId,
      linkedBenchmarkId,
      audience: typeof data.audience === 'string' ? data.audience.trim() : '',
      demand: typeof data.demand === 'string' ? data.demand.trim() : '',
      painPoint: typeof data.painPoint === 'string' ? data.painPoint.trim() : '',
      solution: typeof data.solution === 'string' ? data.solution.trim() : '',
    },
  })
  return NextResponse.json(topic, { status: 201 })
}
