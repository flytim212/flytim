/**
 * 手牌范围系统（169 格制）
 *
 * 格子坐标 "i,j"（i、j ∈ 0~12，0 = A，12 = 2）：
 *   - i === j：对角线，口袋对（点数 = 14 - i）
 *   - i <  j：上三角，同花（高牌 = 14 - i，低牌 = 14 - j）
 *   - i >  j：下三角，不同花（高牌 = 14 - j，低牌 = 14 - i）
 *
 * GridSelection：{ "i,j": 权重(0~100) }
 * 总组合数 = 1326（C(52,2)）：13 对×6 + 78 同花×4 + 78 不同花×12
 */

export type GridSelection = Record<string, number>

/** 点数次序表：索引 0~12 对应 A~2 */
export const RANKS_ORDER = 'AKQJT98765432'

/** 生成格子坐标 key */
export function gridKey(i: number, j: number): string {
  return `${i},${j}`
}

/** 格子坐标是否合法 */
export function isValidKey(key: string): boolean {
  const m = /^(\d+),(\d+)$/.exec(key)
  if (!m) return false
  const i = Number(m[1]), j = Number(m[2])
  return i >= 0 && i <= 12 && j >= 0 && j <= 12
}

/** 格子的文本形式："AKs" / "AKo" / "TT" */
export function gridLabel(i: number, j: number): string {
  const R = RANKS_ORDER
  if (i === j) return R[i] + R[i]
  if (i < j) return R[i] + R[j] + 's'
  return R[j] + R[i] + 'o'
}

/** 文本 → 格子坐标，如 "AKs" → {i:0, j:1}；非法返回 null */
export function labelToGrid(label: string): { i: number; j: number } | null {
  const R = RANKS_ORDER
  const a = R.indexOf(label[0])
  const b = R.indexOf(label[1])
  if (a < 0 || b < 0) return null
  if (label.length === 2) {
    if (a !== b) return null // 两字符必然是口袋对
    return { i: a, j: b }
  }
  const t = label[2]
  if (a === b || (t !== 's' && t !== 'o')) return null
  if (t === 's') return { i: Math.min(a, b), j: Math.max(a, b) } // 同花在上三角
  return { i: Math.max(a, b), j: Math.min(a, b) } // 不同花在下三角
}

/** 格子包含的具体 2 张牌组合数：对子 6 / 同花 4 / 不同花 12 */
export function comboCount(i: number, j: number): number {
  if (i === j) return 6
  if (i < j) return 4
  return 12
}

/** 范围的总组合数（权重折算，权重 100 = 全取） */
export function totalCombos(sel: GridSelection): number {
  let t = 0
  for (const key of Object.keys(sel)) {
    const [i, j] = key.split(',').map(Number)
    t += comboCount(i, j) * (sel[key] / 100)
  }
  return t
}

/**
 * 解析范围记法文本 → GridSelection
 * 支持（逗号或空白分隔）：
 *   - 单个手牌："AKs"、"AKo"、"TT"
 *   - 对子向上："77+" → 77,88,...,AA
 *   - A 高第二张向上："ATs+" → ATs,AJs,AQs,AKs（A 固定）
 *   - 连张平移："76s+" → 76s,87s,...,KQs,AKs（保持间距整体上移，直到高牌到 A）
 */
export function parseRangeText(text: string): GridSelection {
  const sel: GridSelection = {}
  const tokens = text.split(/[\s,]+/).filter(Boolean)
  for (const tok of tokens) {
    const plus = tok.endsWith('+')
    const base = plus ? tok.slice(0, -1) : tok
    const g = labelToGrid(base)
    if (!g) throw new Error(`无法解析的范围记法: "${tok}"`)

    if (!plus) {
      sel[gridKey(g.i, g.j)] = 100
      continue
    }

    // 解析基础牌的两个点数（0=A ... 12=2）
    const hi = g.i <= g.j ? g.i : g.j // 行列中较小索引 = 较高点数
    const lo = g.i <= g.j ? g.j : g.i

    if (hi === lo) {
      // 对子向上：77+ → 77..AA
      for (let r = hi; r >= 0; r--) sel[gridKey(r, r)] = 100
    } else if (hi === 0) {
      // A 固定，第二张向上：ATs+ → ATs..AKs（同花上三角 / 不同花下三角）
      const suited = g.i < g.j
      for (let r = lo; r >= 1; r--) {
        if (suited) sel[gridKey(0, r)] = 100
        else sel[gridKey(r, 0)] = 100
      }
    } else {
      // 保持间距整体平移，直到高牌到 A：76s+ → 76,87,...,KQ,AK
      let h = hi, l = lo
      while (h >= 0 && l >= 0) {
        // 写入格子（同花上三角 / 不同花下三角，保持原后缀）
        if (g.i < g.j) sel[gridKey(h, l)] = 100 // 同花
        else sel[gridKey(l, h)] = 100 // 不同花
        h--
        l--
      }
    }
  }
  return sel
}

/** 展开的具体手牌组合（0~51 索引对 + 权重） */
export interface WeightedCombo {
  c1: number
  c2: number
  weight: number
}

/**
 * 展开范围为具体 2 张牌组合，剔除与已知牌冲突的组合
 * @param sel 范围选择
 * @param excluded 不可用的牌索引集合（我的手牌 + 已翻公共牌）
 */
export function expandRange(sel: GridSelection, excluded: Set<number>): WeightedCombo[] {
  const combos: WeightedCombo[] = []
  for (const key of Object.keys(sel)) {
    const [i, j] = key.split(',').map(Number)
    const weight = sel[key]
    if (weight <= 0) continue

    if (i === j) {
      // 口袋对：同点数 4 花色两两组合
      // 网格索引 0=A → 内部 rankIdx=12（0=2 的编码），需要翻转
      const base = (12 - i) * 4
      for (let a = 0; a < 4; a++) {
        for (let b = a + 1; b < 4; b++) {
          const c1 = base + a, c2 = base + b
          if (excluded.has(c1) || excluded.has(c2)) continue
          combos.push({ c1, c2, weight })
        }
      }
    } else {
      // i<j：同花（高牌=14-i 低牌=14-j）；i>j：不同花（高牌=14-j 低牌=14-i）
      // 网格索引 → 内部 rankIdx = 12 - 网格索引
      const hi = i < j ? i : j // 较高牌的网格索引（较小值）
      const lo = i < j ? j : i
      const hiBase = (12 - hi) * 4
      const loBase = (12 - lo) * 4
      if (i < j) {
        // 同花：4 种花色
        for (let s = 0; s < 4; s++) {
          const c1 = hiBase + s, c2 = loBase + s
          if (excluded.has(c1) || excluded.has(c2)) continue
          combos.push({ c1, c2, weight })
        }
      } else {
        // 不同花：高牌花色 × 低牌花色（4×3=12）
        for (let s1 = 0; s1 < 4; s1++) {
          for (let s2 = 0; s2 < 4; s2++) {
            if (s1 === s2) continue
            const c1 = hiBase + s1, c2 = loBase + s2
            if (excluded.has(c1) || excluded.has(c2)) continue
            combos.push({ c1, c2, weight })
          }
        }
      }
    }
  }
  return combos
}

/** 范围导出为 JSON 字符串（教练定制数据交换用） */
export function exportRangeJSON(sel: GridSelection): string {
  return JSON.stringify(sel, null, 2)
}

/** 从 JSON 字符串导入范围（校验坐标与权重合法性） */
export function importRangeJSON(json: string): GridSelection {
  const obj = JSON.parse(json)
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error('范围数据格式错误：需要 JSON 对象')
  }
  const sel: GridSelection = {}
  for (const key of Object.keys(obj)) {
    if (!isValidKey(key)) throw new Error(`非法格子坐标: "${key}"`)
    const w = Number(obj[key])
    if (!Number.isFinite(w) || w < 0 || w > 100) {
      throw new Error(`非法权重: "${key}" → ${obj[key]}（需要 0~100）`)
    }
    sel[key] = w
  }
  return sel
}
