import { NextResponse } from 'next/server'
import { chatCompletion, getAiConfig, saveAiConfig } from '@/lib/ai'

export const dynamic = 'force-dynamic'

// 测试 AI 连接：POST {}（用已存配置）或 {baseUrl, apiKey, model}（先保存再测）
export async function POST(request: Request) {
  const data = await request.json().catch(() => ({}))
  if (data.baseUrl || data.model || data.apiKey) {
    await saveAiConfig({
      baseUrl: typeof data.baseUrl === 'string' ? data.baseUrl : undefined,
      apiKey: typeof data.apiKey === 'string' ? data.apiKey : undefined,
      model: typeof data.model === 'string' ? data.model : undefined,
    })
  }
  const cfg = await getAiConfig()
  if (!cfg.apiKey) {
    return NextResponse.json(
      { ok: false, error: '还没填 API Key，先在表单里填好' },
      { status: 400 },
    )
  }
  const r = await chatCompletion(cfg, {
    messages: [{ role: 'user', content: '只回复两个字：正常' }],
    max_tokens: 8,
  })
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 502 })
  return NextResponse.json({ ok: true, reply: r.content.slice(0, 50), model: cfg.model })
}
