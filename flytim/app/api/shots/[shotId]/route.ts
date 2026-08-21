import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Params = { params: { shotId: string } }

// 改单个分镜（口播/画面/提示词，或重置图片状态）
export async function PATCH(request: Request, { params }: Params) {
  const shot = await prisma.shot.findUnique({ where: { id: Number(params.shotId) } })
  if (!shot) return NextResponse.json({ error: '分镜不存在' }, { status: 404 })

  const data = await request.json().catch(() => ({}))
  const update: Record<string, string | number> = {}
  for (const k of ['narration', 'sceneDesc', 'imagePrompt'] as const) {
    if (typeof data[k] === 'string') update[k] = (data[k] as string).trim()
  }
  if (Number.isInteger(data.startSec)) update.startSec = Math.max(0, data.startSec)
  if (Number.isInteger(data.endSec)) update.endSec = Math.max(0, data.endSec)
  // 传 resetImage:true 清掉旧图（改了提示词重新生成时用）
  if (data.resetImage === true) {
    update.imageUrl = ''
    update.imageStatus = '未生成'
    update.imageError = ''
  }

  const updated = await prisma.shot.update({ where: { id: shot.id }, data: update })
  return NextResponse.json(updated)
}
