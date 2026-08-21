import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 分镜脚本列表（含分镜数与图片进度）
export async function GET() {
  const storyboards = await prisma.storyboard.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      shots: {
        select: { id: true, imageStatus: true },
      },
    },
  })
  return NextResponse.json(
    storyboards.map((s) => {
      const { shots, ...rest } = s
      return {
        ...rest,
        shotCount: shots.length,
        imageDone: shots.filter((x) => x.imageStatus === '已生成').length,
      }
    }),
  )
}

// 手动创建（一般由 /api/ai/storyboard 自动创建，此接口给 AI/脚本用）
export async function POST(request: Request) {
  const data = await request.json().catch(() => ({}))
  const title = typeof data.title === 'string' ? data.title.trim() : ''
  if (!title) return NextResponse.json({ error: '题目不能为空' }, { status: 400 })

  const storyboard = await prisma.storyboard.create({
    data: {
      title,
      viewpoint: typeof data.viewpoint === 'string' ? data.viewpoint.trim() : '',
      topicId: Number.isInteger(data.topicId) && data.topicId > 0 ? data.topicId : null,
      status: '脚本生成中',
    },
  })
  return NextResponse.json(storyboard, { status: 201 })
}
