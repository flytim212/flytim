import { PLATFORMS } from './constants'

// 录数据表单 → 数据库字段的解析与清洗（POST 全量校验 / PATCH 部分更新共用）

export interface MetricPayload {
  contentId?: number
  platform?: string
  date?: string // ISO 字符串
  views?: number
  completion3s?: number | null
  completionFull?: number | null
  likes?: number
  comments?: number
  saves?: number
  shares?: number
  newFans?: number
  iterationNote?: string
}

function toNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

// 非负整数，默认 0
function int(v: unknown): number {
  const n = toNum(v)
  return n === undefined ? 0 : Math.max(0, Math.round(n))
}

// 百分比：0-100，保留 1 位小数；空值 → null
function pct(v: unknown): number | null {
  const n = toNum(v)
  if (n === undefined) return null
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10))
}

export function parseMetricPayload(
  data: Record<string, unknown>,
  requireAll: boolean,
): { ok: true; value: MetricPayload } | { ok: false; error: string } {
  const value: MetricPayload = {}

  if (data.contentId !== undefined || requireAll) {
    const id = toNum(data.contentId)
    if (!id || !Number.isInteger(id)) return { ok: false, error: '请选择内容' }
    value.contentId = id
  }

  if (data.platform !== undefined || requireAll) {
    const p = String(data.platform ?? '')
    if (!(PLATFORMS as readonly string[]).includes(p)) {
      return { ok: false, error: '平台不合法' }
    }
    value.platform = p
  }

  if (data.date !== undefined || requireAll) {
    const d = String(data.date ?? '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { ok: false, error: '日期格式错误' }
    value.date = new Date(`${d}T00:00:00.000Z`).toISOString()
  }

  if (data.views !== undefined) value.views = int(data.views)
  if (data.completion3s !== undefined) value.completion3s = pct(data.completion3s)
  if (data.completionFull !== undefined) value.completionFull = pct(data.completionFull)
  if (data.likes !== undefined) value.likes = int(data.likes)
  if (data.comments !== undefined) value.comments = int(data.comments)
  if (data.saves !== undefined) value.saves = int(data.saves)
  if (data.shares !== undefined) value.shares = int(data.shares)
  if (data.newFans !== undefined) value.newFans = int(data.newFans)
  if (data.iterationNote !== undefined) value.iterationNote = String(data.iterationNote).trim()

  return { ok: true, value }
}
