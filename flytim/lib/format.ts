// 日期均为「纯日期」语义：数据库存 UTC 零点，序列化为 ISO 字符串
// 前端取 ISO 前 10 位即 YYYY-MM-DD，不受时区影响

export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

// 本地日期 → 'YYYY-MM-DD'（供 <input type="date"> 与按日聚合使用）
export function localDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function formatDateCN(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${y}/${Number(m)}/${Number(d)}`
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return ''
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${Number(m)}/${Number(d)}`
}
