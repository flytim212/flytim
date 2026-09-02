/**
 * 牌编码与基础工具
 *
 * 数据规范：
 * - Card: { r: 2~14（14=A）, s: 's'|'h'|'d'|'c' }
 * - 字符串形式："As"、"Td"、"2c"
 *
 * 内部高性能索引（0~51）：rankIdx(0~12) * 4 + suitIdx(0~3)
 *   rankIdx = r - 2（0 对应 2，12 对应 A）
 *   suitIdx: s=0, h=1, d=2, c=3
 * 该索引用于评估器与蒙特卡洛热路径，避免对象分配。
 */

export type Suit = 's' | 'h' | 'd' | 'c'

export interface Card {
  r: number
  s: Suit
}

/** 花色显示符号 */
export const SUIT_SYMBOLS: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }

/** 花色颜色（黑/红） */
export const SUIT_COLORS: Record<Suit, 'black' | 'red'> = { s: 'black', c: 'black', h: 'red', d: 'red' }

/** 点数字符表：索引 0~12 对应 2~A */
export const RANK_CHARS = '23456789TJQKA'

const SUITS: readonly Suit[] = ['s', 'h', 'd', 'c']

/** 花色 → 索引（热路径查表用） */
const SUIT_IDX: Record<Suit, number> = { s: 0, h: 1, d: 2, c: 3 }

/** 解析 "As" → Card；非法输入抛出错误 */
export function parseCard(str: string): Card {
  if (!str || str.length !== 2) {
    throw new Error(`非法牌面: "${str}"`)
  }
  const rIdx = RANK_CHARS.indexOf(str[0])
  const s = str[1] as Suit
  if (rIdx < 0 || !SUITS.includes(s)) {
    throw new Error(`非法牌面: "${str}"`)
  }
  return { r: rIdx + 2, s }
}

/** Card → "As" 形式字符串 */
export function cardToString(c: Card): string {
  return RANK_CHARS[c.r - 2] + c.s
}

/** Card → 0~51 内部索引（rankIdx*4 + suitIdx） */
export function cardIndex(c: Card): number {
  return (c.r - 2) * 4 + SUIT_IDX[c.s]
}

/** 0~51 内部索引 → Card */
export function indexToCard(i: number): Card {
  return { r: (i >> 2) + 2, s: SUITS[i & 3] }
}

/** 两张牌是否完全相同 */
export function sameCard(a: Card, b: Card): boolean {
  return a.r === b.r && a.s === b.s
}

/** 生成 52 张完整牌堆 */
export function makeDeck(): Card[] {
  const deck: Card[] = []
  for (let i = 0; i < 52; i++) deck.push(indexToCard(i))
  return deck
}

/** 批量解析字符串数组（Worker 消息用） */
export function parseCards(strs: string[]): Card[] {
  return strs.map(parseCard)
}
