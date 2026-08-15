import { prisma } from '@/lib/prisma'

// AI 服务配置：任何 OpenAI 兼容接口（GLM / DeepSeek / Kimi / OpenAI…）
export type AiConfig = {
  baseUrl: string // 例：https://open.bigmodel.cn/api/paas/v4
  apiKey: string
  model: string // 例：glm-4v / glm-4.5v（要支持图片得用视觉模型）
}

const KEY = 'aiConfig'

const DEFAULTS: AiConfig = {
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  apiKey: '',
  model: 'glm-4.5v',
}

export async function getAiConfig(): Promise<AiConfig> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } })
  if (!row) return { ...DEFAULTS }
  try {
    const parsed = JSON.parse(row.value) as Partial<AiConfig>
    return {
      baseUrl:
        typeof parsed.baseUrl === 'string' && parsed.baseUrl.trim()
          ? parsed.baseUrl.trim().replace(/\/+$/, '')
          : DEFAULTS.baseUrl,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model:
        typeof parsed.model === 'string' && parsed.model.trim()
          ? parsed.model.trim()
          : DEFAULTS.model,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export async function saveAiConfig(input: Partial<AiConfig>): Promise<AiConfig> {
  const cur = await getAiConfig()
  const next: AiConfig = {
    baseUrl:
      typeof input.baseUrl === 'string' && input.baseUrl.trim()
        ? input.baseUrl.trim().replace(/\/+$/, '')
        : cur.baseUrl,
    // apiKey 传空字符串 = 保持原值（避免前端回显掩码把 key 覆盖掉）
    apiKey:
      typeof input.apiKey === 'string' && input.apiKey.trim()
        ? input.apiKey.trim()
        : cur.apiKey,
    model:
      typeof input.model === 'string' && input.model.trim()
        ? input.model.trim()
        : cur.model,
  }
  await prisma.setting.upsert({
    where: { key: KEY },
    update: { value: JSON.stringify(next) },
    create: { key: KEY, value: JSON.stringify(next) },
  })
  return next
}

// 掩码版（给前端回显），sk-abcdefgh1234 → sk-ab****1234
export function maskConfig(c: AiConfig) {
  const k = c.apiKey
  const masked =
    k.length <= 8 ? (k ? '****' : '') : `${k.slice(0, 4)}****${k.slice(-4)}`
  return { baseUrl: c.baseUrl, model: c.model, hasKey: k !== '', maskedKey: masked }
}

// 调 chat completions（OpenAI 兼容格式）
export async function chatCompletion(
  cfg: AiConfig,
  body: Record<string, unknown>,
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ ...body, model: cfg.model }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `AI 接口返回 ${res.status}：${text.slice(0, 200)}` }
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = data.choices?.[0]?.message?.content ?? ''
    if (!content) return { ok: false, error: 'AI 返回了空内容' }
    return { ok: true, content }
  } catch (e) {
    return { ok: false, error: `连不上 AI 接口：${e instanceof Error ? e.message : String(e)}` }
  }
}
