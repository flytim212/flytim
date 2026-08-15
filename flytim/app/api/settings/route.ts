import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const KEY = 'customBannedWords'

// 读取配置（当前仅：自定义禁词表）
export async function GET() {
  const row = await prisma.setting.findUnique({ where: { key: KEY } })
  let customBannedWords: string[] = []
  if (row) {
    try {
      const parsed = JSON.parse(row.value)
      if (Array.isArray(parsed)) {
        customBannedWords = parsed.filter((w): w is string => typeof w === 'string')
      }
    } catch {
      // 忽略坏数据，回到默认
    }
  }
  return NextResponse.json({ customBannedWords })
}

// 保存自定义禁词表
export async function PUT(request: Request) {
  const data = await request.json().catch(() => ({}))
  const words = Array.isArray(data.customBannedWords)
    ? data.customBannedWords
        .filter((w: unknown): w is string => typeof w === 'string')
        .map((w: string) => w.trim())
        .filter(Boolean)
    : []

  await prisma.setting.upsert({
    where: { key: KEY },
    update: { value: JSON.stringify(words) },
    create: { key: KEY, value: JSON.stringify(words) },
  })
  return NextResponse.json({ customBannedWords: words })
}
