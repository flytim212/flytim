import { NextResponse } from 'next/server'
import { getAiConfig, maskConfig, saveAiConfig } from '@/lib/ai'

export const dynamic = 'force-dynamic'

// 读取 AI 服务配置（key 掩码显示）
export async function GET() {
  const cfg = await getAiConfig()
  return NextResponse.json(maskConfig(cfg))
}

// 保存配置；{testOnly:true} 只测不存
export async function PUT(request: Request) {
  const data = await request.json().catch(() => ({}))
  const cfg = await saveAiConfig({
    baseUrl: typeof data.baseUrl === 'string' ? data.baseUrl : undefined,
    apiKey: typeof data.apiKey === 'string' ? data.apiKey : undefined,
    model: typeof data.model === 'string' ? data.model : undefined,
  })
  return NextResponse.json(maskConfig(cfg))
}
