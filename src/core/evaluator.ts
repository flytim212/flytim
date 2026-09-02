/**
 * 牌型评估器（核心模块）
 *
 * 编码规范（在用户规范基础上的必要扩展，见下方说明）：
 *   value = (grade << 25) | (k1 << 20) | (k2 << 15) | (k3 << 10) | (k4 << 5) | k5
 *
 *   grade：8=同花顺 7=四条 6=葫芦 5=同花 4=顺子 3=三条 2=两对 1=一对 0=高牌
 *   k1..k5：从高到低的关键点数（rank 2~14），每槽 5bit
 *
 * 关于扩展的说明：
 *   原规范 (grade<<20)|(k1<<15)|(k2<<10)|(k3<<5)|k4 只有 4 个 kicker 槽，
 *   而高牌与同花有 5 个互不相同的点数（例如 AKQJ9 与 AKQJ8 必须能够分出大小），
 *   4 个槽在数学上装不下 5 个点数。因此在保持「每个 kicker 槽 5bit、等级位于最高位、
 *   返回值可直接用 >/< 比大小」这三条核心约定不变的前提下，扩展出第 5 个 kicker 槽
 *   （k5，仅高牌/同花使用），等级位移由 20 调整为 25。其余所有牌型 k5 恒为 0。
 *
 * 性能设计：
 *   - 热路径使用 0~51 整数牌索引，不产生任何对象分配
 *   - 顺子查询使用预计算表 STRAIGHT（8192 项），O(1) 判定
 *   - 点数计数复用模块级 Uint8Array，调用结束后归零，无 GC 压力
 */

import { Card } from './cards'

// ---------------------------------------------------------------------------
// 预计算：顺子查询表
// mask 的 bit b 代表点数 b+2（bit12 = A）
// STRAIGHT[mask] = 该点数集合下最高顺子的顶牌（5~14），无顺子为 0
// ---------------------------------------------------------------------------
const STRAIGHT = new Uint8Array(8192)

;(function initStraightTable() {
  // 普通顺子：顶牌 6~14
  for (let top = 6; top <= 14; top++) {
    let m = 0
    for (let r = top - 4; r <= top; r++) m |= 1 << (r - 2)
    STRAIGHT[m] = top
  }
  // A-5 低顺（A 当 1）：A + 2,3,4,5，顶牌记为 5
  STRAIGHT[(1 << 12) | 0b1111] = 5
})()

// 复用的点数计数缓冲（JS 单线程，模块级复用安全；调用结束归零）
const RC = new Uint8Array(13)

/** 从 mask 中排除 exclMask 后，自高到低取 n 个点数，依次填入 startShift, startShift-5, ... */
function kickers(mask: number, exclMask: number, n: number, startShift: number): number {
  let m = mask & ~exclMask
  let v = 0
  let shift = startShift
  while (n > 0 && m) {
    const hb = 31 - Math.clz32(m) // 最高位位号
    v |= (hb + 2) << shift
    m ^= 1 << hb
    shift -= 5
    n--
  }
  return v
}

/** 5 个互不相同的点数（高牌/同花用）：从高到低填满 5 个槽 */
function encode5Ranks(mask: number): number {
  let v = 0
  let shift = 20
  let m = mask
  while (m) {
    const hb = 31 - Math.clz32(m)
    v |= (hb + 2) << shift
    m ^= 1 << hb
    shift -= 5
  }
  return v
}

/**
 * 快速版 evaluate5：输入 5 个 0~51 牌索引
 * 约定：5 张牌互不相同（由调用方保证，如从去重牌堆采样）
 */
export function eval5Fast(a: number, b: number, c: number, d: number, e: number): number {
  const ra = a >> 2, rb = b >> 2, rc = c >> 2, rd = d >> 2, re = e >> 2
  const sa = a & 3, sb = b & 3, sc = c & 3, sd = d & 3, se = e & 3

  // 点数计数与点数掩码
  RC[ra]++; RC[rb]++; RC[rc]++; RC[rd]++; RC[re]++
  const mask = (1 << ra) | (1 << rb) | (1 << rc) | (1 << rd) | (1 << re)

  let result: number
  const isFlush = sa === sb && sa === sc && sa === sd && sa === se

  if (isFlush) {
    const sh = STRAIGHT[mask]
    if (sh > 0) {
      // 同花顺（含皇家同花顺）
      result = (8 << 25) | (sh << 20)
    } else {
      // 同花：5 个点数从高到低
      result = (5 << 25) | encode5Ranks(mask)
    }
  } else {
    // 遍历出现过的点数，归类四条/三条/对子
    let quad = -1, trips = -1, p1 = -1, p2 = -1
    let m = mask
    while (m) {
      const lb = m & -m
      const bi = 31 - Math.clz32(lb)
      const cnt = RC[bi]
      if (cnt === 4) quad = bi
      else if (cnt === 3) trips = bi
      else if (cnt === 2) {
        // 位号升序遍历，后遇到的一定更大
        p2 = p1
        p1 = bi
      }
      m ^= lb
    }

    if (quad >= 0) {
      // 四条 + 1 踢脚
      result = (7 << 25) | ((quad + 2) << 20) | kickers(mask, 1 << quad, 1, 15)
    } else if (trips >= 0 && p1 >= 0) {
      // 葫芦（三条 + 对子）
      result = (6 << 25) | ((trips + 2) << 20) | ((p1 + 2) << 15)
    } else if (trips >= 0) {
      // 三条 + 2 踢脚
      result = (3 << 25) | ((trips + 2) << 20) | kickers(mask, 1 << trips, 2, 15)
    } else if (p2 >= 0) {
      // 两对 + 1 踢脚（p1 > p2）
      result = (2 << 25) | ((p1 + 2) << 20) | ((p2 + 2) << 15) | kickers(mask, (1 << p1) | (1 << p2), 1, 10)
    } else if (p1 >= 0) {
      // 一对 + 3 踢脚
      result = (1 << 25) | ((p1 + 2) << 20) | kickers(mask, 1 << p1, 3, 15)
    } else {
      const sh = STRAIGHT[mask]
      if (sh > 0) {
        // 顺子：只需顶牌（A-5 低顺顶为 5）
        result = (4 << 25) | (sh << 20)
      } else {
        // 高牌：5 个点数从高到低
        result = encode5Ranks(mask)
      }
    }
  }

  // 归零复用缓冲
  RC[ra]--; RC[rb]--; RC[rc]--; RC[rd]--; RC[re]--
  return result
}

/**
 * 快速版 evaluate7：输入 7 个 0~51 牌索引的数组
 * 从 7 张中枚举 C(7,5)=21 种组合取最大值（组合已硬编码展开）
 */
export function eval7Fast(c: number[]): number {
  const c0 = c[0], c1 = c[1], c2 = c[2], c3 = c[3], c4 = c[4], c5 = c[5], c6 = c[6]
  let best = eval5Fast(c0, c1, c2, c3, c4)
  let v: number
  // 21 组合硬编码展开（避免循环索引开销，热路径）
  v = eval5Fast(c0, c1, c2, c3, c5); if (v > best) best = v
  v = eval5Fast(c0, c1, c2, c3, c6); if (v > best) best = v
  v = eval5Fast(c0, c1, c2, c4, c5); if (v > best) best = v
  v = eval5Fast(c0, c1, c2, c4, c6); if (v > best) best = v
  v = eval5Fast(c0, c1, c2, c5, c6); if (v > best) best = v
  v = eval5Fast(c0, c1, c3, c4, c5); if (v > best) best = v
  v = eval5Fast(c0, c1, c3, c4, c6); if (v > best) best = v
  v = eval5Fast(c0, c1, c3, c5, c6); if (v > best) best = v
  v = eval5Fast(c0, c1, c4, c5, c6); if (v > best) best = v
  v = eval5Fast(c0, c2, c3, c4, c5); if (v > best) best = v
  v = eval5Fast(c0, c2, c3, c4, c6); if (v > best) best = v
  v = eval5Fast(c0, c2, c3, c5, c6); if (v > best) best = v
  v = eval5Fast(c0, c2, c4, c5, c6); if (v > best) best = v
  v = eval5Fast(c0, c3, c4, c5, c6); if (v > best) best = v
  v = eval5Fast(c1, c2, c3, c4, c5); if (v > best) best = v
  v = eval5Fast(c1, c2, c3, c4, c6); if (v > best) best = v
  v = eval5Fast(c1, c2, c3, c5, c6); if (v > best) best = v
  v = eval5Fast(c1, c2, c4, c5, c6); if (v > best) best = v
  v = eval5Fast(c1, c3, c4, c5, c6); if (v > best) best = v
  v = eval5Fast(c2, c3, c4, c5, c6); if (v > best) best = v
  return best
}

/** Card → 0~51 索引 */
function toIdx(c: Card): number {
  const s = c.s
  return (c.r - 2) * 4 + (s === 's' ? 0 : s === 'h' ? 1 : s === 'd' ? 2 : 3)
}

/** 规范接口：评估 5 张牌，返回可直接比大小的整数 */
export function evaluate5(cards: Card[]): number {
  if (cards.length !== 5) {
    throw new Error(`evaluate5 需要恰好 5 张牌，收到 ${cards.length} 张`)
  }
  return eval5Fast(toIdx(cards[0]), toIdx(cards[1]), toIdx(cards[2]), toIdx(cards[3]), toIdx(cards[4]))
}

/** 规范接口：评估 7 张牌 = 枚举 C(7,5)=21 种组合取最大值 */
export function evaluate7(cards: Card[]): number {
  if (cards.length !== 7) {
    throw new Error(`evaluate7 需要恰好 7 张牌，收到 ${cards.length} 张`)
  }
  return eval7Fast(cards.map(toIdx))
}

/** 从评估值中提取牌型等级（0~8，测试与展示用） */
export function gradeOf(value: number): number {
  return value >>> 25
}

/** 牌型中文名（展示用） */
const GRADE_NAMES = ['高牌', '一对', '两对', '三条', '顺子', '同花', '葫芦', '四条', '同花顺']

export function handTypeName(value: number): string {
  return GRADE_NAMES[gradeOf(value)]
}
