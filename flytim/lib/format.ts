// 日期均为「纯日期」语义：数据库存 UTC 零点，序列化为 ISO 字符串
// 前端取 ISO 前 10 位即 YYYY-MM-DD，不受时区影响

export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
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
