import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 笔记列表（?course= 只看某课程；默认全部，按课程名+创建时间排序）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const course = searchParams.get('course')

  const notes = await prisma.note.findMany({
    where: course ? { course } : {},
    orderBy: [{ course: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(notes)
}

export async function POST(request: Request) {
  const data = await request.json().catch(() => ({}))
  const course = String(data.course ?? '').trim()
  if (!course) return NextResponse.json({ error: '课程名不能为空' }, { status: 400 })

  const note = await prisma.note.create({
    data: {
      course,
      episode: String(data.episode ?? '').trim(),
      content: String(data.content ?? ''),
    },
  })
  return NextResponse.json(note, { status: 201 })
}
