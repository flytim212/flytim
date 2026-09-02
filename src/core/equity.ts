/**
 * 蒙特卡洛 equity（胜率）计算
 *
 * 算法流程（用户规范）：
 *   1. 展开对手范围为具体 2 张手牌集合（剔除与已知牌冲突的组合）
 *   2. 每次迭代：按权重随机采样对手手牌 → 随机补全剩余公共牌 → evaluate7 比大小
 *   3. 返回 { win, tie, lose, elapsedMs }，通过 onProgress 回调增量上报进度
 *
 * 关于「对数间隔随机采样保证结果无偏」的实现说明：
 *   - 采样本身：对手手牌按权重二分采样、公共牌用部分 Fisher-Yates 洗牌均匀抽取，
 *     两者都是均匀/按权重的无偏采样，不引入任何系统性偏差；
 *   - 进度上报：按对数间隔的里程碑点（1%、2%、5%、10%、25%、50%、75%、100%）
 *     增量上报，早期快速反馈、后期平滑收敛，上报节奏不影响采样无偏性。
 *
 * 性能设计：
 *   - 全程使用 0~51 整数牌索引，热路径零对象分配（复用预分配数组）
 *   - villain 手牌通过 O(1) 的位置交换移出可抽区域，无需每次拷贝牌堆
 *   - 评估走 eval5Fast / eval7Fast（硬编码 21 组合展开）
 */

import { Card, cardIndex } from './cards'
import { GridSelection, expandRange } from './ranges'
import { eval7Fast } from './evaluator'

export interface EquityResult {
  /** 胜的次数 */
  win: number
  /** 平的次数 */
  tie: number
  /** 败的次数 */
  lose: number
  /** 总耗时（毫秒） */
  elapsedMs: number
}

export interface EquityProgress {
  done: number
  total: number
  win: number
  tie: number
  lose: number
  elapsedMs: number
}

/** 对数间隔的进度里程碑（比例） */
const PROGRESS_POINTS = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 0.75, 1]

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

/**
 * 蒙特卡洛计算一手牌对抗一个范围的胜率
 *
 * @param hole 我的手牌（恰好 2 张）
 * @param board 已翻公共牌（0~5 张）
 * @param villainRange 对手范围（169 格制选择）
 * @param iterations 模拟次数
 * @param onProgress 进度回调（对数间隔触发）
 * @param rng 随机数源（默认 Math.random，测试可注入种子）
 */
export function equity(
  hole: Card[],
  board: Card[],
  villainRange: GridSelection,
  iterations: number,
  onProgress?: (p: EquityProgress) => void,
  rng: () => number = Math.random,
): EquityResult {
  if (hole.length !== 2) {
    throw new Error(`我的手牌需要恰好 2 张，收到 ${hole.length} 张`)
  }
  if (board.length > 5) {
    throw new Error(`公共牌最多 5 张，收到 ${board.length} 张`)
  }
  if (!Number.isInteger(iterations) || iterations < 1) {
    throw new Error(`模拟次数需要为正整数，收到 ${iterations}`)
  }

  const t0 = nowMs()

  // ---- 1. 已知牌索引 ----
  const holeIdx = hole.map(cardIndex)
  const boardIdx = board.map(cardIndex)
  const known = new Set<number>([...holeIdx, ...boardIdx])

  // ---- 2. 展开对手范围（剔除冲突组合）+ 累积权重 ----
  const combos = expandRange(villainRange, known)
  if (combos.length === 0) {
    throw new Error('对手范围与已知牌完全冲突，无法展开任何手牌组合')
  }
  const cum: number[] = new Array(combos.length)
  {
    let acc = 0
    for (let i = 0; i < combos.length; i++) {
      acc += combos[i].weight
      cum[i] = acc
    }
  }
  const totalW = cum[cum.length - 1]

  // ---- 3. 剩余牌堆 + 牌→位置映射（O(1) 交换用） ----
  const remain: number[] = []
  for (let i = 0; i < 52; i++) {
    if (!known.has(i)) remain.push(i)
  }
  const M = remain.length
  const pos = new Int8Array(52).fill(-1)
  for (let i = 0; i < M; i++) pos[remain[i]] = i

  const boardKnown = boardIdx.length
  const boardNeed = 5 - boardKnown

  // 预分配的 7 张数组（复用，零分配）
  const hero7 = [0, 0, 0, 0, 0, 0, 0]
  const villain7 = [0, 0, 0, 0, 0, 0, 0]

  let win = 0, tie = 0, lose = 0

  // 进度里程碑（对数间隔）
  const milestones = PROGRESS_POINTS.map(p => Math.max(1, Math.floor(p * iterations)))
  let mi = 0

  for (let it = 0; it < iterations; it++) {
    // ---- 按权重采样对手手牌（累积权重 + 二分） ----
    const x = rng() * totalW
    let lo = 0, hi = cum.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cum[mid] < x) lo = mid + 1
      else hi = mid
    }
    const combo = combos[lo]

    // ---- 把 villain 两张牌交换到牌堆尾部（移出可抽区域） ----
    swapTo(remain, pos, combo.c1, M - 1)
    swapTo(remain, pos, combo.c2, M - 2)

    // ---- 部分 Fisher-Yates：从 remain[0 .. M-3) 均匀抽取 boardNeed 张 ----
    for (let i = 0; i < boardNeed; i++) {
      const j = i + ((rng() * (M - 2 - i)) | 0)
      if (j !== i) {
        const a = remain[i]
        remain[i] = remain[j]
        remain[j] = a
        pos[remain[i]] = i
        pos[remain[j]] = j
      }
    }

    // ---- 组装双方 7 张牌（已知公共牌 + 本次抽取的补牌） ----
    hero7[0] = holeIdx[0]
    hero7[1] = holeIdx[1]
    villain7[0] = combo.c1
    villain7[1] = combo.c2
    for (let k = 0; k < boardKnown; k++) {
      const b = boardIdx[k]
      hero7[2 + k] = b
      villain7[2 + k] = b
    }
    for (let k = 0; k < boardNeed; k++) {
      const b = remain[k]
      hero7[2 + boardKnown + k] = b
      villain7[2 + boardKnown + k] = b
    }

    // ---- evaluate7 比大小 ----
    const hv = eval7Fast(hero7)
    const vv = eval7Fast(villain7)
    if (hv > vv) win++
    else if (hv < vv) lose++
    else tie++

    // ---- 对数间隔上报进度 ----
    while (mi < milestones.length && it + 1 >= milestones[mi]) {
      onProgress?.({
        done: it + 1,
        total: iterations,
        win, tie, lose,
        elapsedMs: nowMs() - t0,
      })
      mi++
    }
  }

  return { win, tie, lose, elapsedMs: nowMs() - t0 }
}

/** 把指定牌换到 remain 的目标位置（保持 remain/pos 互为逆映射） */
function swapTo(remain: number[], pos: Int8Array, card: number, target: number): void {
  const p = pos[card]
  if (p === target) return
  const other = remain[target]
  remain[target] = card
  remain[p] = other
  pos[card] = target
  pos[other] = p
}
