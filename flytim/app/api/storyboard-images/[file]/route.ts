import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const IMG_DIR = path.join(process.cwd(), '.data', 'storyboards')

// 读取分镜图片文件（.data/storyboards/ 下，防目录穿越）
export async function GET(
  _request: Request,
  { params }: { params: { file: string } },
) {
  const file = path.basename(params.file) // 去掉任何路径部分
  if (!/^sb\d+-shot\d+-\d+\.(png|jpg)$/.test(file)) {
    return NextResponse.json({ error: '非法文件名' }, { status: 400 })
  }
  try {
    const buf = await readFile(path.join(IMG_DIR, file))
    const ct = file.endsWith('.jpg') ? 'image/jpeg' : 'image/png'
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: '图片不存在' }, { status: 404 })
  }
}
