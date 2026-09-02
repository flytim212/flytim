/** 牌编码工具函数测试 */
import { describe, expect, it } from 'vitest'
import {
  Card, RANK_CHARS, SUIT_COLORS, SUIT_SYMBOLS,
  cardIndex, cardToString, indexToCard, makeDeck, parseCard, sameCard,
} from '../cards'

describe('parseCard / cardToString', () => {
  it('52 张牌 round-trip：字符串 → Card → 字符串', () => {
    for (const r of RANK_CHARS) {
      for (const s of ['s', 'h', 'd', 'c'] as const) {
        const str = r + s
        expect(cardToString(parseCard(str))).toBe(str)
      }
    }
  })

  it('parseCard("As") → { r: 14, s: "s" }', () => {
    expect(parseCard('As')).toEqual({ r: 14, s: 's' })
  })

  it('parseCard("Td") → { r: 10, s: "d" }', () => {
    expect(parseCard('Td')).toEqual({ r: 10, s: 'd' })
  })

  it('parseCard("2c") → { r: 2, s: "c" }', () => {
    expect(parseCard('2c')).toEqual({ r: 2, s: 'c' })
  })

  it('非法输入抛错：空串 / 1 字符 / 3 字符', () => {
    expect(() => parseCard('')).toThrow()
    expect(() => parseCard('A')).toThrow()
    expect(() => parseCard('Asx')).toThrow()
  })

  it('非法输入抛错：坏点数 / 坏花色', () => {
    expect(() => parseCard('1s')).toThrow()
    expect(() => parseCard('Ax')).toThrow()
    expect(() => parseCard('ZZ')).toThrow()
  })
})

describe('cardIndex / indexToCard', () => {
  it('52 个索引 round-trip：Card → index → Card', () => {
    for (let i = 0; i < 52; i++) {
      expect(cardIndex(indexToCard(i))).toBe(i)
    }
  })

  it('索引范围 0~51：2s=0，Ac=51', () => {
    expect(cardIndex(parseCard('2s'))).toBe(0)
    expect(cardIndex(parseCard('Ac'))).toBe(51)
  })

  it('同点数 4 花色索引连续', () => {
    const a = cardIndex(parseCard('Th'))
    expect(cardIndex(parseCard('Ts'))).toBe(a - 1)
    expect(cardIndex(parseCard('Td'))).toBe(a + 1)
    expect(cardIndex(parseCard('Tc'))).toBe(a + 2)
  })
})

describe('makeDeck / sameCard', () => {
  it('牌堆恰好 52 张且无重复', () => {
    const deck = makeDeck()
    expect(deck).toHaveLength(52)
    const keys = new Set(deck.map(c => cardToString(c)))
    expect(keys.size).toBe(52)
  })

  it('sameCard 判断', () => {
    expect(sameCard(parseCard('As'), parseCard('As'))).toBe(true)
    expect(sameCard(parseCard('As'), parseCard('Ah'))).toBe(false)
    expect(sameCard(parseCard('As'), parseCard('Ks'))).toBe(false)
  })
})

describe('展示常量', () => {
  it('花色符号与颜色', () => {
    expect(SUIT_SYMBOLS.s).toBe('♠')
    expect(SUIT_SYMBOLS.h).toBe('♥')
    expect(SUIT_COLORS.s).toBe('black')
    expect(SUIT_COLORS.d).toBe('red')
  })

  it('花色全集（类型完整性）', () => {
    const suits: Card['s'][] = ['s', 'h', 'd', 'c']
    expect(suits).toHaveLength(4)
  })
})
