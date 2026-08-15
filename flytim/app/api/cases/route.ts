import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EMOTION_TYPES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

function cleanDate(v: unknown): Date | null {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Date(`${v}T00:00:00.000Z`)
  }
  return null
}

// 案例列表（?usable=true 只看可用作选题的）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const usable = searchParams.get('usable')

  const cases = await prisma.case.findMany({
    where: usable === 'true' ? { usableAsTopic: true } : {},
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(cases)
}

export async function POST(request: Request) {
  const data = await request.json().catch(() => ({}))
  const trigger = String(data.trigger ?? '').trim()
  if (!trigger) return NextResponse.json({ error: '触发事件不能为空' }, { status: 400 })

  const c = await prisma.case.create({
    data: {
      date: cleanDate(data.date) ?? new Date(),
      trigger,
      emotionType: (EMOTION_TYPES as readonly string[]).includes(String(data.emotionType))
        ? String(data.emotionType)
        : '其他',
      bodySignal: String(data.bodySignal ?? '').trim(),
      action: String(data.action ?? '').trim(),
      result: String(data.result ?? '').trim(),
      usableAsTopic: data.usableAsTopic === true || data.usableAsTopic === 'true',
    },
  })
  return NextResponse.json(c, { status: 201 })
}
