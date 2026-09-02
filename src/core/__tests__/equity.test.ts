/**
 * equity 蒙特卡洛测试：统计正确性、边界场景、进度回调、性能验收
 *
 * 统计断言说明：蒙特卡洛结果有随机波动，断言采用已知理论值的宽容区间。
 */
import { describe, expect, it } from 'vitest'
import { parseCards } from '../cards'
import { equity } from '../equity'
import { topXPercent } from '../presets'
import { GridSelection, parseRangeText } from '../ranges'

/** 全范围（169 格全 100%）= 对手完全随机 */
function fullRange(): GridSelection {
  const sel: GridSelection = {}
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) sel[`${i},${j}`] = 100
  }
  return sel
}

describe('equity 统计正确性', () => {
  it('AA vs 全范围（随机对手）≈ 85%', () => {
    const res = equity(parseCards(['As', 'Ah']), [], fullRange(), 20000)
    const winPct = (res.win + res.tie * 0.5) / 20000
    expect(winPct).toBeGreaterThan(0.81)
    expect(winPct).toBeLessThan(0.89)
  })

  it('AA vs 顶 10% 范围 ≈ 84%（强对手范围内略降）', () => {
    const res = equity(parseCards(['As', 'Ah']), [], topXPercent(10), 20000)
    const winPct = (res.win + res.tie * 0.5) / 20000
    expect(winPct).toBeGreaterThan(0.75)
    expect(winPct).toBeLessThan(0.92)
  })

  it('72o vs 全范围 < AA vs 全范围', () => {
    const weak = equity(parseCards(['7c', '2d']), [], fullRange(), 10000)
    const strong = equity(parseCards(['As', 'Ah']), [], fullRange(), 10000)
    expect((weak.win + weak.tie * 0.5) / 10000).toBeLessThan((strong.win + strong.tie * 0.5) / 10000)
  })

  it('结果计数之和 = 模拟次数', () => {
    const res = equity(parseCards(['Ks', 'Qs']), parseCards(['2h', '7d', '9c']), topXPercent(20), 5000)
    expect(res.win + res.tie + res.lose).toBe(5000)
  })

  it('翻牌天糊（皇家已在翻牌）→ 100% 胜', () => {
    // 我持 As Ks，翻牌 Qs Js Ts：皇家同花顺已成型，对手不可能追平或反超
    const res = equity(parseCards(['As', 'Ks']), parseCards(['Qs', 'Js', 'Ts']), fullRange(), 3000)
    expect(res.win).toBe(3000)
    expect(res.lose).toBe(0)
    expect(res.tie).toBe(0)
  })

  it('公共牌满 5 张皇家 → 全平', () => {
    // 桌面 As Ks Qs Js Ts：双方最优都是桌面皇家
    const res = equity(parseCards(['2c', '3d']), parseCards(['As', 'Ks', 'Qs', 'Js', 'Ts']), fullRange(), 3000)
    expect(res.tie).toBe(3000)
  })

  it('对手范围锁定单格：villain 恒为该手牌组合（采样生效）', () => {
    // 我持 As Ks，对手范围仅 78s（去掉冲突花色后仍有多组合同花）
    const res = equity(parseCards(['As', 'Ks']), [], parseRangeText('87s'), 3000)
    expect(res.win + res.tie + res.lose).toBe(3000)
    // AKs vs 87s 理论约 68%，宽区间验证采样按范围生效（而非全随机）
    const winPct = (res.win + res.tie * 0.5) / 3000
    expect(winPct).toBeGreaterThan(0.55)
    expect(winPct).toBeLessThan(0.80)
  })

  it('范围只含 AA → 等价于对抗 AA', () => {
    // 我持 As Ks，对手范围仅 AA（去掉 As 后剩 AhAd/AhAc/AdAc 3 种）
    const res = equity(parseCards(['As', 'Ks']), [], parseRangeText('AA'), 20000)
    const winPct = (res.win + res.tie * 0.5) / 20000
    // AKs vs AA 理论约 12%
    expect(winPct).toBeGreaterThan(0.07)
    expect(winPct).toBeLessThan(0.17)
  })

  it('权重影响采样频率：AA 格 100 vs 72o 格 100 → 覆盖全部', () => {
    // 粗验证：加权范围不抛错且计数守恒
    const sel = { '0,0': 100, '12,0': 100 } // AA + 72o
    const res = equity(parseCards(['Ks', 'Qs']), [], sel, 5000)
    expect(res.win + res.tie + res.lose).toBe(5000)
  })
})

describe('参数校验与边界', () => {
  it('手牌非 2 张抛错', () => {
    expect(() => equity(parseCards(['As']), [], fullRange(), 100)).toThrow()
    expect(() => equity(parseCards(['As', 'Ks', 'Qs']), [], fullRange(), 100)).toThrow()
  })

  it('公共牌超过 5 张抛错', () => {
    expect(() =>
      equity(parseCards(['As', 'Ks']), parseCards(['2c', '3d', '4h', '5s', '6c', '7d']), fullRange(), 100),
    ).toThrow()
  })

  it('模拟次数非正抛错', () => {
    expect(() => equity(parseCards(['As', 'Ks']), [], fullRange(), 0)).toThrow()
    expect(() => equity(parseCards(['As', 'Ks']), [], fullRange(), 1.5)).toThrow()
  })

  it('范围与已知牌完全冲突抛错', () => {
    // 我持 As Ah，公共 Ad Ac：AA 的 6 种组合全部冲突
    expect(() =>
      equity(parseCards(['As', 'Ah']), parseCards(['Ad', 'Ac']), parseRangeText('AA'), 100),
    ).toThrow()
  })

  it('转牌面（4 张公共牌）只补 1 张', () => {
    const res = equity(
      parseCards(['As', 'Ks']),
      parseCards(['Qs', 'Js', 'Ts', '2c']),
      topXPercent(20),
      2000,
    )
    expect(res.win + res.tie + res.lose).toBe(2000)
    // 已有皇家（As Ks Qs Js Ts），必胜
    expect(res.win).toBe(2000)
  })
})

describe('进度回调（对数间隔）', () => {
  it('按里程碑上报且最后一条 done=total', () => {
    const events: number[] = []
    const res = equity(parseCards(['As', 'Ks']), [], topXPercent(20), 1000, (p) => {
      events.push(p.done)
    })
    expect(events.length).toBeGreaterThanOrEqual(5) // 1%,2%,5%,10%...100% 至少 8 个点
    expect(events[events.length - 1]).toBe(1000)
    expect(events).toEqual([...events].sort((a, b) => a - b)) // 递增
    expect(res.elapsedMs).toBeGreaterThanOrEqual(0)
  })

  it('不传回调也可正常运行', () => {
    const res = equity(parseCards(['As', 'Ks']), [], topXPercent(20), 500)
    expect(res.win + res.tie + res.lose).toBe(500)
  })
})

describe('性能验收', () => {
  it('10 万次模拟耗时输出（验收目标：中端手机 < 500ms，桌面应显著更快）', () => {
    const ITER = 100000
    const res = equity(parseCards(['As', 'Ks']), [], topXPercent(20), ITER)
    // 控制台输出实测时间（规范要求）
    // eslint-disable-next-line no-console
    console.log(
      `[性能验收] 10 万次蒙特卡洛模拟实测耗时: ${res.elapsedMs.toFixed(1)}ms（验收目标：中端手机 < 500ms）`,
    )
    // CI 机器性能浮动，宽松上限 2000ms；真实验收以实测输出为准
    expect(res.elapsedMs).toBeLessThan(2000)
    expect(res.win + res.tie + res.lose).toBe(ITER)
  })
})
