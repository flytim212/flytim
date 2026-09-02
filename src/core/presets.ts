/**
 * 教学版基础范围表
 *
 * 数据来源说明：参考 GTO Wizard / 简单GTO 等公开免费的 6max 100bb 翻前范围形状，
 * 做教学级简化（权重归一为 100，剔除混合频率细节），仅用于训练演示。
 * 支持通过 JSON 导入导出替换为教练定制数据。
 *
 * 位置说明（6max）：UTG=枪口 MP=中间位 CO=关煞 BTN=按钮 SB=小盲
 */

import { GridSelection, gridLabel, parseRangeText } from './ranges'

export interface RangePreset {
  id: string
  name: string
  category: '翻前开局' | '翻前对抗'
  note: string
  /** 记法文本（便于阅读与维护） */
  notation: string
  selection: GridSelection
}

function preset(id: string, name: string, category: RangePreset['category'], note: string, notation: string): RangePreset {
  return { id, name, category, note, notation, selection: parseRangeText(notation) }
}

/** 教学版预设范围表 */
export const RANGE_PRESETS: RangePreset[] = [
  // ---------------- 翻前开局（RFI，标准 100bb 深度） ----------------
  preset('utg-open', 'UTG 开局加注', '翻前开局', '约 14% · 6max 教学简化版',
    '66+, A5s+, KTs+, QTs+, JTs, T9s, 98s, 87s, 76s, 65s, 54s, AJo+, KQo'),
  preset('mp-open', 'MP 开局加注', '翻前开局', '约 20% · 6max 教学简化版',
    '22+, A2s+, K9s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, 54s, ATo+, KJo+'),
  preset('co-open', 'CO 开局加注', '翻前开局', '约 28% · 6max 教学简化版',
    '22+, A2s+, K8s+, Q9s+, J9s+, T8s+, 97s+, 86s+, 76s, 65s, 54s, A9o+, KTo+, QJo, JTo'),
  preset('btn-open', 'BTN 开局加注', '翻前开局', '约 45% · 6max 教学简化版',
    '22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 97s+, 86s+, 76s, 65s, 54s, A2o+, K9o+, QTo+, JTo, T9o'),
  preset('sb-open', 'SB 开局加注', '翻前开局', '约 46% · 对抗 BB 单挑 · 教学简化版',
    '22+, A2s+, K4s+, Q6s+, J7s+, T7s+, 97s+, 86s+, 76s, 65s, 54s, A2o+, K9o+, QTo+, JTo, T9o, 98o'),

  // ---------------- 翻前对抗（3bet / 跟注，教学简化版） ----------------
  preset('btn-3bet', 'BTN 反加（3bet）', '翻前对抗', 'vs CO 开局 · 价值+诈唬混合 · 约 5%',
    'JJ+, AQs+, KQs, A5s, A4s, AKo, AQo'),
  preset('sb-3bet', 'SB 反加（3bet）', '翻前对抗', 'vs BTN 开局 · 约 6%',
    'TT+, AJs+, KQs, A5s, A4s, AQo+, AKo'),
  preset('co-call3bet', 'CO 跟注反加', '翻前对抗', 'vs BTN 3bet · 约 6%',
    '77, 88, 99, TT, JJ, AJs, ATs, KQs, QJs, JTs, T9s, 98s, AQo, AJo'),
]

// ---------------------------------------------------------------------------
// 一键 Top X%：按通用强度序列累计组合数
// 序列为教学版近似排序（参考公开的翻前手牌强度排序），供快速选择对手范围
// ---------------------------------------------------------------------------
const TOP_ORDER_NOTATION = [
  // 1-20
  'AA', 'KK', 'QQ', 'JJ', 'AKs', 'TT', 'AQs', 'AKo', 'AJs', 'KQs',
  '99', 'ATs', 'AQo', 'KJs', 'QJs', 'KTs', 'AJo', 'QTs', '77', 'JTs',
  // 21-40
  'A9s', 'KQo', 'ATo', '88', 'A8s', 'K9s', 'QJo', 'Q9s', 'A5s', 'A7s',
  'KJo', 'T9s', '66', 'A4s', 'A6s', 'A3s', 'JTo', 'KTo', 'A2s', 'QTo',
  // 41-60
  '55', 'A9o', 'K8s', 'J9s', '98s', 'T8s', 'K7s', 'Q8s', 'A8o', 'J8s',
  'K6s', '44', 'K5s', 'Q7s', 'T7s', 'A7o', '97s', 'K4s', '87s', 'Q6s',
  // 61-80
  'A5o', '33', 'K3s', 'Q5s', 'J7s', '76s', 'K2s', 'A6o', 'Q4s', 'T6s',
  '96s', 'A4o', 'Q3s', '22', 'J6s', 'K9o', '86s', 'Q2s', 'A3o', 'J5s',
  // 81-100
  '65s', 'Q9o', 'T5s', 'J4s', '75s', 'J9o', 'A2o', 'J3s', '54s', 'T9o',
  'T4s', '95s', 'J2s', 'T8o', 'Q8o', '64s', 'J8o', 'T3s', '43s', '85s',
  // 101-120
  'Q7o', 'K8o', 'J7o', 'T2s', '53s', 'J6o', '98o', '87o', 'T7o', '97o',
  '76o', 'T6o', '96o', 'J5o', '86o', '65o', 'T5o', 'J4o', '54o', '75o',
  // 121-140
  'T4o', '95o', 'J3o', 'K7o', 'K6o', '64o', 'T3o', '85o', 'K5o', 'Q6o',
  '43o', 'J2o', '53o', 'T2o', 'Q5o', '42s', '42o', '32s', '32o', '94s',
  // 141-160
  '93s', '92s', '84s', '83s', '82s', '74s', '73s', '72s', '63s', '62s',
  '52s', '94o', '93o', '92o', 'K4o', 'Q4o', '84o', '83o', '82o', '74o',
  // 161-169
  '73o', '72o', 'K3o', 'Q3o', '63o', '62o', 'K2o', 'Q2o', '52o',
]

/** 强度序列（169 格，已验证唯一性，见单测） */
export const TOP_ORDER: { i: number; j: number }[] = (() => {
  const list: { i: number; j: number }[] = []
  for (const label of TOP_ORDER_NOTATION) {
    const R = 'AKQJT98765432'
    const a = R.indexOf(label[0])
    const b = R.indexOf(label[1])
    if (label.length === 2) {
      list.push({ i: a, j: b })
    } else if (label[2] === 's') {
      list.push({ i: Math.min(a, b), j: Math.max(a, b) })
    } else {
      list.push({ i: Math.max(a, b), j: Math.min(a, b) })
    }
  }
  return list
})()

/** 强度序列的文本形式（展示用） */
export function topOrderLabels(): string[] {
  return TOP_ORDER.map(g => gridLabel(g.i, g.j))
}

/**
 * 一键选择顶 X% 范围（0 < pct <= 100）
 * 按强度序列累计组合数，直到覆盖 pct% × 1326
 */
export function topXPercent(pct: number): GridSelection {
  if (pct <= 0 || pct > 100) {
    throw new Error(`pct 需要在 (0, 100] 区间，收到 ${pct}`)
  }
  const target = (pct / 100) * 1326
  const sel: GridSelection = {}
  let acc = 0
  for (const g of TOP_ORDER) {
    if (acc >= target) break
    const key = `${g.i},${g.j}`
    sel[key] = 100
    acc += g.i === g.j ? 6 : g.i < g.j ? 4 : 12
  }
  return sel
}
