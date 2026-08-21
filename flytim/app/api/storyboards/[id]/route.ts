import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

// 分镜脚本详情（含全部分镜，按顺序）
export async function GET(_request: Request, { params }: Params) {
  const storyboard = await prisma.storyboard.findUnique({
    where: { id: Number(params.id) },
    include: { shots: { orderBy: { order: 'asc' } } },
  })
  if (!storyboard) return NextResponse.json({ error: '脚本不存在' }, { status: 404 })
  return NextResponse.json(storyboard)
}

export async function DELETE(_request: Request, { params }: Params) {
  await prisma.storyboard.delete({ where: { id: Number(params.id) } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
