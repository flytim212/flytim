import { prisma } from '@/lib/prisma'

// AI 服务配置：任何 OpenAI 兼容接口（GLM / DeepSeek / Kimi / OpenAI…）
export type AiConfig = {
  baseUrl: string // 例：https://open.bigmodel.cn/api/paas/v4
  apiKey: string
  model: string // 例：glm-4v / glm-4.5v（要支持图片得用视觉模型）
  imageModel: string // 图片生成模型，如 cogman-1.5-flash（智谱 images/generations）
}

const KEY = 'aiConfig'

const DEFAULTS: AiConfig = {
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  apiKey: '',
  model: 'glm-4.5v',
  imageModel: 'cogman-1.5-flash',
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
      imageModel:
        typeof parsed.imageModel === 'string' && parsed.imageModel.trim()
          ? parsed.imageModel.trim()
          : DEFAULTS.imageModel,
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
    imageModel:
      typeof input.imageModel === 'string' && input.imageModel.trim()
        ? input.imageModel.trim()
        : cur.imageModel,
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
  return {
    baseUrl: c.baseUrl,
    model: c.model,
    imageModel: c.imageModel,
    hasKey: k !== '',
    maskedKey: masked,
  }
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

// 调图片生成（智谱 images/generations 格式，OpenAI images API 同构）
// 返回图片二进制 Buffer
export async function generateImage(
  cfg: AiConfig,
  prompt: string,
): Promise<{ ok: true; buffer: Buffer; ext: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${cfg.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.imageModel,
        prompt,
        size: '768x1344', // 9:16 竖屏
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `图片接口返回 ${res.status}：${text.slice(0, 200)}` }
    }
    const data = (await res.json()) as {
      data?: { url?: string; b64_json?: string }[]
    }
    const item = data.data?.[0]

    // 情况1：直接返回 base64
    if (item?.b64_json) {
      return { ok: true, buffer: Buffer.from(item.b64_json, 'base64'), ext: 'png' }
    }
    // 情况2：返回 URL，下载
    if (item?.url) {
      const imgRes = await fetch(item.url)
      if (!imgRes.ok) return { ok: false, error: `下载图片失败：${imgRes.status}` }
      const buf = Buffer.from(await imgRes.arrayBuffer())
      const ct = imgRes.headers.get('content-type') ?? ''
      const ext = ct.includes('jpeg') || ct.includes('jpg') ? 'jpg' : 'png'
      return { ok: true, buffer: buf, ext }
    }
    return { ok: false, error: '图片接口没返回 url 或 b64_json' }
  } catch (e) {
    return { ok: false, error: `连不上图片接口：${e instanceof Error ? e.message : String(e)}` }
  }
}
