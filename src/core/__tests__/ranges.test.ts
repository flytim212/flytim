/** 范围系统测试：169 格制、记法解析、组合展开、TopX%、预设数据 */
import { describe, expect, it } from 'vitest'
import { parseCards, cardIndex } from '../cards'
import {
  GridSelection, comboCount, expandRange, exportRangeJSON, gridLabel,
  importRangeJSON, labelToGrid, parseRangeText, totalCombos,
} from '../ranges'
import { RANGE_PRESETS, TOP_ORDER, topOrderLabels, topXPercent } from '../presets'

describe('格子坐标与文本互转', () => {
  it('gridLabel：(0,1)=AKs、(1,0)=AKo、(4,4)=TT', () => {
    expect(gridLabel(0, 1)).toBe('AKs')
    expect(gridLabel(1, 0)).toBe('AKo')
    expect(gridLabel(4, 4)).toBe('TT')
    expect(gridLabel(0, 12)).toBe('A2s')
    expect(gridLabel(12, 0)).toBe('A2o')
  })

  it('labelToGrid round-trip：全部 169 格', () => {
    for (let i = 0; i < 13; i++) {
      for (let j = 0; j < 13; j++) {
        const g = labelToGrid(gridLabel(i, j))
        expect(g).toEqual({ i, j })
      }
    }
  })

  it('labelToGrid 非法输入返回 null', () => {
    expect(labelToGrid('AXs')).toBeNull()
    expect(labelToGrid('AK')).toBeNull() // 两字符必须同点数（口袋对）
    expect(labelToGrid('AAs')).toBeNull() // 口袋对不带后缀
    expect(labelToGrid('AKx')).toBeNull()
  })

  it('comboCount：对子 6 / 同花 4 / 不同花 12', () => {
    expect(comboCount(0, 0)).toBe(6)
    expect(comboCount(0, 1)).toBe(4)
    expect(comboCount(1, 0)).toBe(12)
  })
})

describe('记法解析 parseRangeText', () => {
  it('单个手牌', () => {
    expect(parseRangeText('AKs')).toEqual({ '0,1': 100 })
    expect(parseRangeText('TT')).toEqual({ '4,4': 100 })
  })

  it('对子向上：77+ → 77..AA 共 8 格', () => {
    const sel = parseRangeText('77+')
    expect(Object.keys(sel)).toHaveLength(8)
    expect(sel['7,7']).toBe(100) // 77
    expect(sel['0,0']).toBe(100) // AA
  })

  it('A 高第二张向上：ATs+ → ATs,AJs,AQs,AKs', () => {
    const sel = parseRangeText('ATs+')
    expect(Object.keys(sel)).toHaveLength(4)
    expect(sel['0,4']).toBe(100) // ATs
    expect(sel['0,1']).toBe(100) // AKs
    expect(sel['0,5']).toBeUndefined() // A9s 不包含
  })

  it('连张平移：76s+ → 76s..KQs,AKs（间距保持）', () => {
    const sel = parseRangeText('76s+')
    expect(Object.keys(sel)).toHaveLength(8) // 76,87,98,T9,JT,QJ,KQ,AK
    expect(sel['7,8']).toBe(100) // 76s
    expect(sel['0,1']).toBe(100) // AKs（平移到顶）
  })

  it('混合记法：逗号/空格分隔', () => {
    const sel = parseRangeText('AA, KK AKs 22+')
    // 22+ = 13 个对子（含 AA KK，去重），加 AKs 共 14 格
    expect(Object.keys(sel)).toHaveLength(14)
    expect(sel['0,0']).toBe(100)
    expect(sel['0,1']).toBe(100)
  })

  it('非法记法抛错', () => {
    expect(() => parseRangeText('ZZ+')).toThrow()
    expect(() => parseRangeText('hello')).toThrow()
  })
})

describe('范围展开 expandRange', () => {
  it('全部 169 格 100% → 1326 组合', () => {
    const sel: GridSelection = {}
    for (let i = 0; i < 13; i++) {
      for (let j = 0; j < 13; j++) sel[`${i},${j}`] = 100
    }
    const combos = expandRange(sel, new Set())
    expect(combos).toHaveLength(1326)
  })

  it('冲突剔除：范围 AKs 且我持 As → 剩 3 组合', () => {
    const sel = parseRangeText('AKs')
    const hero = parseCards(['As', '2c']).map(cardIndex)
    const combos = expandRange(sel, new Set(hero))
    expect(combos).toHaveLength(3)
    // 剩余组合不含 As
    for (const c of combos) {
      expect(c.c1).not.toBe(hero[0])
      expect(c.c2).not.toBe(hero[0])
    }
  })

  it('口袋对冲突：范围 AA 且我持 As Ah → 剩 1 组合（AdAc）', () => {
    const sel = parseRangeText('AA')
    const hero = parseCards(['As', 'Ah']).map(cardIndex)
    const combos = expandRange(sel, new Set(hero))
    expect(combos).toHaveLength(1)
  })

  it('权重随组合传递', () => {
    const sel = { '0,0': 50 } // AA 50%
    const combos = expandRange(sel, new Set())
    expect(combos).toHaveLength(6)
    for (const c of combos) expect(c.weight).toBe(50)
  })

  it('totalCombos：169 格全 100 → 1326', () => {
    const sel: GridSelection = {}
    for (let i = 0; i < 13; i++) {
      for (let j = 0; j < 13; j++) sel[`${i},${j}`] = 100
    }
    expect(totalCombos(sel)).toBe(1326)
  })

  it('totalCombos：权重 50 折半', () => {
    expect(totalCombos({ '0,0': 50 })).toBe(3) // 6 × 0.5
  })
})

describe('JSON 导入导出', () => {
  it('round-trip 保持一致', () => {
    const sel = parseRangeText('22+, AKs, AQo')
    const json = exportRangeJSON(sel)
    const back = importRangeJSON(json)
    expect(back).toEqual(sel)
  })

  it('非法坐标抛错', () => {
    expect(() => importRangeJSON('{"13,0": 100}')).toThrow()
    expect(() => importRangeJSON('{"abc": 100}')).toThrow()
  })

  it('非法权重抛错', () => {
    expect(() => importRangeJSON('{"0,0": 101}')).toThrow()
    expect(() => importRangeJSON('{"0,0": -1}')).toThrow()
    expect(() => importRangeJSON('{"0,0": "fast"}')).toThrow()
  })
})

describe('强度序列 TOP_ORDER', () => {
  it('恰好 169 项且无重复', () => {
    expect(TOP_ORDER).toHaveLength(169)
    const keys = new Set(TOP_ORDER.map(g => `${g.i},${g.j}`))
    expect(keys.size).toBe(169)
  })

  it('topOrderLabels 与 TOP_ORDER 一致', () => {
    const labels = topOrderLabels()
    expect(labels).toHaveLength(169)
    expect(new Set(labels).size).toBe(169)
    expect(labels[0]).toBe('AA')
  })
})

describe('topXPercent', () => {
  it('顶 100% = 全部 169 格（1326 组合）', () => {
    const sel = topXPercent(100)
    expect(Object.keys(sel)).toHaveLength(169)
    expect(totalCombos(sel)).toBe(1326)
  })

  it('顶 10% ≈ 10% × 1326 组合（±1 格容差）', () => {
    const sel = topXPercent(10)
    const t = totalCombos(sel)
    expect(t).toBeGreaterThanOrEqual(126)
    expect(t).toBeLessThanOrEqual(146)
  })

  it('顶 20% / 50% 递增包含', () => {
    const top10 = topXPercent(10)
    const top20 = topXPercent(20)
    const top50 = topXPercent(50)
    for (const k of Object.keys(top10)) expect(top20[k]).toBeDefined()
    for (const k of Object.keys(top20)) expect(top50[k]).toBeDefined()
    expect(totalCombos(top50)).toBeGreaterThan(totalCombos(top20))
  })

  it('最顶范围包含 AA KK QQ JJ AKs', () => {
    const sel = topXPercent(2)
    expect(sel['0,0']).toBe(100) // AA
    expect(sel['1,1']).toBe(100) // KK
    expect(sel['2,2']).toBe(100) // QQ
    expect(sel['3,3']).toBe(100) // JJ
    expect(sel['0,1']).toBe(100) // AKs
  })

  it('非法百分比抛错', () => {
    expect(() => topXPercent(0)).toThrow()
    expect(() => topXPercent(101)).toThrow()
  })
})

describe('教学版预设范围表', () => {
  it('每个预设非空且坐标合法', () => {
    expect(RANGE_PRESETS.length).toBeGreaterThanOrEqual(8)
    for (const p of RANGE_PRESETS) {
      const keys = Object.keys(p.selection)
      expect(keys.length).toBeGreaterThan(0)
      for (const k of keys) {
        expect(k).toMatch(/^(\d|1[0-2]),(\d|1[0-2])$/)
        expect(p.selection[k]).toBe(100)
      }
    }
  })

  it('开局范围宽度从 UTG 到 BTN 递增', () => {
    const pct = (id: string) => totalCombos(RANGE_PRESETS.find(p => p.id === id)!.selection) / 1326
    expect(pct('utg-open')).toBeLessThan(pct('mp-open'))
    expect(pct('mp-open')).toBeLessThan(pct('co-open'))
    expect(pct('co-open')).toBeLessThan(pct('btn-open'))
  })

  it('UTG 开局约 12%~18%', () => {
    const pct = totalCombos(RANGE_PRESETS.find(p => p.id === 'utg-open')!.selection) / 1326
    expect(pct).toBeGreaterThan(0.12)
    expect(pct).toBeLessThan(0.18)
  })
})
