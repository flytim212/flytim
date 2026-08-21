import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateImage, getAiConfig } from '@/lib/ai'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type Params = { params: { id: string } }

const IMG_DIR = path.join(process.cwd(), '.data', 'storyboards')

// 批量生成分镜图片：POST → 顺序生成所有未生成/失败的分镜图
export async function POST(_request: Request, { params }: Params) {
  const cfg = await getAiConfig()
  if (!cfg.apiKey) {
    return NextResponse.json(
      { error: '还没配置 AI 服务，先到「设置」页填写 API Key 和图片模型' },
      { status: 400 },
    )
  }

  const id = Number(params.id)
  const storyboard = await prisma.storyboard.findUnique({
    where: { id },
    include: { shots: { orderBy: { order: 'asc' } } },
  })
  if (!storyboard) return NextResponse.json({ error: '脚本不存在' }, { status: 404 })

  const todo = storyboard.shots.filter((s) => s.imageStatus !== '已生成')
  if (todo.length === 0) {
    return NextResponse.json({ ok: true, generated: 0, failed: 0, note: '全部分镜图已生成' })
  }

  await prisma.storyboard.update({ where: { id }, data: { status: '图片生成中', error: '' } })
  await prisma.shot.updateMany({
    where: { id: { in: todo.map((s) => s.id) } },
    data: { imageStatus: '生成中' },
  })

  await mkdir(IMG_DIR, { recursive: true })
  let generated = 0
  let failed = 0
  const errors: string[] = []

  for (const shot of todo) {
    if (!shot.imagePrompt) {
      await prisma.shot.update({
        where: { id: shot.id },
        data: { imageStatus: '失败', imageError: '没有 seedance 提示词' },
      })
      failed++
      errors.push(`分镜${shot.order}：没有提示词`)
      continue
    }
    const r = await generateImage(cfg, shot.imagePrompt)
    if (!r.ok) {
      await prisma.shot.update({
        where: { id: shot.id },
        data: { imageStatus: '失败', imageError: r.error },
      })
      failed++
      errors.push(`分镜${shot.order}：${r.error}`)
      continue
    }
    const filename = `sb${id}-shot${shot.id}-${Date.now()}.${r.ext}`
    await writeFile(path.join(IMG_DIR, filename), r.buffer)
    await prisma.shot.update({
      where: { id: shot.id },
      data: { imageUrl: `/api/storyboard-images/${filename}`, imageStatus: '已生成' },
    })
    generated++
  }

  const all = await prisma.shot.findMany({ where: { storyboardId: id }, select: { imageStatus: true } })
  const status = all.every((s) => s.imageStatus === '已生成') ? '完成' : '图片生成中'
  await prisma.storyboard.update({
    where: { id },
    data: { status, error: failed > 0 ? errors.join('；').slice(0, 500) : '' },
  })

  return NextResponse.json({ ok: failed === 0, generated, failed, errors })
}
