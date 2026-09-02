/**
 * 牌型评估器测试：覆盖 9 级牌型排序、A-5 低顺、同花 kicker、两对踢脚等 40+ 边界用例
 */
import { describe, expect, it } from 'vitest'
import { parseCards } from '../cards'
import { eval5Fast, eval7Fast, evaluate5, evaluate7, gradeOf, handTypeName } from '../evaluator'

const ev5 = (s: string) => evaluate5(parseCards(s.split(' ')))
const ev7 = (s: string) => evaluate7(parseCards(s.split(' ')))
const ev7i = (s: string) => eval7Fast(parseCards(s.split(' ')).map(c => (c.r - 2) * 4 + ['s', 'h', 'd', 'c'].indexOf(c.s)))

describe('九级牌型大小排序', () => {
  it('皇家同花顺 > 同花顺', () => {
    expect(ev5('As Ks Qs Js Ts')).toBeGreaterThan(ev5('Kd Qd Jd Td 9d'))
  })

  it('皇家同花顺 > 四条 A', () => {
    expect(ev5('As Ks Qs Js Ts')).toBeGreaterThan(ev5('Ah Ad Ac As Kd'))
  })

  it('同花顺 > 四条', () => {
    expect(ev5('9h 8h 7h 6h 5h')).toBeGreaterThan(ev5('Ah Ad Ac As Kd'))
  })

  it('四条 > 葫芦', () => {
    expect(ev5('2s 2h 2d 2c As')).toBeGreaterThan(ev5('Ks Kh Kd Qs Qh'))
  })

  it('小四条 > 大葫芦', () => {
    expect(ev5('2s 2h 2d 2c 3s')).toBeGreaterThan(ev5('Ks Kh Kd Qs Qh'))
  })

  it('葫芦 > 同花', () => {
    expect(ev5('2s 2h 2d 3s 3h')).toBeGreaterThan(ev5('As Ks Qs Js 9s'))
  })

  it('同花 > 顺子', () => {
    expect(ev5('2s 4s 6s 8s Ts')).toBeGreaterThan(ev5('Ah Kd Qs Jc Td'))
  })

  it('顺子 > 三条', () => {
    expect(ev5('Ah Kd Qs Jc Td')).toBeGreaterThan(ev5('As Ah Ad Ks Qd'))
  })

  it('三条 > 两对', () => {
    expect(ev5('As Ah Ad 2s 3h')).toBeGreaterThan(ev5('As Ah Ks Kh Qd'))
  })

  it('两对 > 一对', () => {
    expect(ev5('As Ah Ks Kh 2d')).toBeGreaterThan(ev5('As Ah Ks Qd Jc'))
  })

  it('一对 > 高牌', () => {
    expect(ev5('2s 2h 3d 4s 7c')).toBeGreaterThan(ev5('As Kh Qs Jd 9c'))
  })
})

describe('等级提取与牌型名', () => {
  it('gradeOf 正确提取 0~8', () => {
    expect(gradeOf(ev5('As Ks Qs Js Ts'))).toBe(8)
    expect(gradeOf(ev5('Ah Ad Ac As Kd'))).toBe(7)
    expect(gradeOf(ev5('Ks Kh Kd Qs Qh'))).toBe(6)
    expect(gradeOf(ev5('As Ks Qs Js 9s'))).toBe(5)
    expect(gradeOf(ev5('Ah Kd Qs Jc Td'))).toBe(4)
    expect(gradeOf(ev5('As Ah Ad Ks Qd'))).toBe(3)
    expect(gradeOf(ev5('As Ah Ks Kh Qd'))).toBe(2)
    expect(gradeOf(ev5('As Ah Ks Qd Jc'))).toBe(1)
    expect(gradeOf(ev5('As Kh Qs Jd 9c'))).toBe(0)
  })

  it('handTypeName 输出中文名', () => {
    expect(handTypeName(ev5('As Ks Qs Js Ts'))).toBe('同花顺')
    expect(handTypeName(ev5('2s 2h 3d 4s 7c'))).toBe('一对')
  })
})

describe('A-5 低顺（A 当 1）', () => {
  it('A2345 是顺子（顶为 5）', () => {
    expect(gradeOf(ev5('Ah 2c 3d 4s 5h'))).toBe(4)
  })

  it('A2345 < 23456（顶 5 < 顶 6）', () => {
    expect(ev5('Ah 2c 3d 4s 5h')).toBeLessThan(ev5('2h 3c 4d 5s 6h'))
  })

  it('A2345 = 5432A（同一副牌不同顺序）', () => {
    expect(ev5('Ah 2c 3d 4s 5h')).toBe(ev5('5h 4s 3d 2c Ah'))
  })

  it('A2345 顺子 > A 高牌 AKQJ9', () => {
    expect(ev5('Ah 2c 3d 4s 5h')).toBeGreaterThan(ev5('Ah Kh Qs Jd 9c'))
  })

  it('钢轮（同花 A-5）是同花顺且顶为 5', () => {
    const wheel = ev5('As 2s 3s 4s 5s')
    expect(gradeOf(wheel)).toBe(8)
    // 同花顺顶牌 5 → k1 = 5
    expect((wheel >>> 20) & 31).toBe(5)
  })

  it('钢轮 < 6 高同花顺', () => {
    expect(ev5('As 2s 3s 4s 5s')).toBeLessThan(ev5('6h 7h 8h 9h Th'))
  })

  it('A 混入非顺场景不误判：A K 9 8 7 是高牌', () => {
    expect(gradeOf(ev5('Ah Kc 9d 8s 7h'))).toBe(0)
  })
})

describe('同花比 kicker（含第 5 张）', () => {
  it('A 高同花：第二张 K > Q', () => {
    expect(ev5('As Ks 9s 8s 7s')).toBeGreaterThan(ev5('As Qs 9s 8s 7s'))
  })

  it('同花第 5 张 kicker：AKQJ9 > AKQJ8', () => {
    expect(ev5('As Ks Qs Js 9s')).toBeGreaterThan(ev5('As Ks Qs Js 8s'))
  })

  it('同花第 4 张 kicker：AKQJ9 > AKJT9', () => {
    expect(ev5('As Ks Qs Js 9s')).toBeGreaterThan(ev5('As Ks Js Ts 9s'))
  })

  it('A 高同花 > K 高同花', () => {
    expect(ev5('As 9s 8s 7s 5s')).toBeGreaterThan(ev5('Ks Qs 9s 7s 5s'))
  })

  it('点数全相同的两个同花相等（花色无关）', () => {
    expect(ev5('As Ks Qs Js 9s')).toBe(ev5('Ah Kh Qh Jh 9h'))
  })
})

describe('两对踢脚与对子踢脚', () => {
  it('两对踢脚：AAKKQ > AAKKJ', () => {
    expect(ev5('As Ah Ks Kh Qd')).toBeGreaterThan(ev5('As Ah Ks Kh Jd'))
  })

  it('两对踢脚最小差距：AAKK2 vs AAKK2 相等', () => {
    expect(ev5('As Ah Ks Kh 2d')).toBe(ev5('Ac Ad Kc Kd 2h'))
  })

  it('更高两对胜：AA22 vs KKQQ', () => {
    expect(ev5('As Ah 2s 2h Kd')).toBeGreaterThan(ev5('Ks Kh Qs Qh Ad'))
  })

  it('两对 vs 两对：第二对决定：AAKK < AAQQ? 不——AAKK > AAQQ', () => {
    expect(ev5('As Ah Ks Kh 2d')).toBeGreaterThan(ev5('As Ah Qs Qh 2d'))
  })

  it('一对踢脚链：AAKQJ > AAKQT > AAKJT', () => {
    const a = ev5('As Ah Ks Qd Jc')
    const b = ev5('As Ah Ks Qd Tc')
    const c = ev5('As Ah Ks Jd Tc')
    expect(a).toBeGreaterThan(b)
    expect(b).toBeGreaterThan(c)
  })

  it('一对踢脚到第 3 张：AAK98 > AAK97', () => {
    expect(ev5('As Ah Ks 9d 8c')).toBeGreaterThan(ev5('As Ah Ks 9d 7c'))
  })
})

describe('四条 / 葫芦 / 三条细节', () => {
  it('四条 kicker：AAAAK > AAAAQ', () => {
    expect(ev5('As Ah Ad Ac Kd')).toBeGreaterThan(ev5('As Ah Ad Ac Qd'))
  })

  it('四条点数：AAAA2 > KKKKA', () => {
    expect(ev5('As Ah Ad Ac 2d')).toBeGreaterThan(ev5('Ks Kh Kd Kc Ad'))
  })

  it('葫芦：大三条优先 AAA22 > KKKAA', () => {
    expect(ev5('As Ah Ad 2s 2h')).toBeGreaterThan(ev5('Ks Kh Kd As Ah'))
  })

  it('葫芦：同三条比口袋 AAA33 > AAA22', () => {
    expect(ev5('As Ah Ad 3s 3h')).toBeGreaterThan(ev5('As Ah Ad 2s 2h'))
  })

  it('三条踢脚：AAAKQ > AAAKJ', () => {
    expect(ev5('As Ah Ad Ks Qd')).toBeGreaterThan(ev5('As Ah Ad Ks Jd'))
  })

  it('三条踢脚第 2 张：AAAK9 > AAAK8', () => {
    expect(ev5('As Ah Ad Ks 9d')).toBeGreaterThan(ev5('As Ah Ad Ks 8d'))
  })
})

describe('顺子细节', () => {
  it(' Broadway（TJQKA）> 9TJQK', () => {
    expect(ev5('Th Jh Qd Ks Ac')).toBeGreaterThan(ev5('9h Th Jd Qs Kc'))
  })

  it('不同花色同顶顺子相等', () => {
    expect(ev5('Th Jh Qd Ks Ac')).toBe(ev5('Tc Jc Qh Kd As'))
  })

  it('顺子编码：kicker 槽全为 0（只看顶牌）', () => {
    const v = ev5('Th Jh Qd Ks Ac')
    expect(v & ((1 << 20) - 1)).toBe(0)
  })
})

describe('高牌细节（5 张点数全编码）', () => {
  it('AKQJ9 > AKQJ8（第 5 张）', () => {
    expect(ev5('Ah Kc Qd Js 9h')).toBeGreaterThan(ev5('Ah Kc Qd Js 8h'))
  })

  it('AKQJ9 > AKQT9（第 3 张）', () => {
    expect(ev5('Ah Kc Qd Js 9h')).toBeGreaterThan(ev5('Ah Kc Qd Ts 9h'))
  })

  it('高牌相等（花色无关）', () => {
    expect(ev5('Ah Kc Qd Js 9h')).toBe(ev5('As Kd Qc Jh 9s'))
  })
})

describe('evaluate7（21 组合枚举）', () => {
  it('7 张含皇家：选 5 张组成最优', () => {
    expect(gradeOf(ev7('As Ks Qs 2c 3h Js Ts'))).toBe(8)
  })

  it('7 张四条 + kicker 提取', () => {
    const v = ev7('As Ah Ad Ac Kd 2c 3h')
    expect(gradeOf(v)).toBe(7)
    expect((v >>> 20) & 31).toBe(14) // 四条 A
    expect((v >>> 15) & 31).toBe(13) // 踢脚 K
  })

  it('7 张隐藏葫芦：AAA + KK', () => {
    const v = ev7('As Ah Ad Ks Kh 2c 3h')
    expect(gradeOf(v)).toBe(6)
  })

  it('7 张取最大同花', () => {
    const v = ev7('As Ks Qs Js 9s 2c 3h')
    expect(gradeOf(v)).toBe(5)
    expect((v >>> 20) & 31).toBe(14)
  })

  it('7 张中 A-5 轮子顺', () => {
    expect(gradeOf(ev7('Ah 2c 3d 4s 5h Kc Qd'))).toBe(4)
  })

  it('7 张两对选择：取最大的两对 + 最大踢脚', () => {
    // 7 张含 AA / KK / 55，最优两效应为 AA+KK，踢脚从剩余（Q）中取
    const v = ev7('As Ah Ks Kh 5d 5c Qs')
    expect(gradeOf(v)).toBe(2)
    expect((v >>> 20) & 31).toBe(14) // 大对 AA
    expect((v >>> 15) & 31).toBe(13) // 小对 KK
    expect((v >>> 10) & 31).toBe(12) // 踢脚 Q
  })

  it('7 张高牌取前 5 大点数', () => {
    // A K Q J 9 8 7（无同花无顺无对）→ 高牌 AKQJ9
    const v = ev7('Ah Kc Qd Js 9h 8c 7d')
    expect(gradeOf(v)).toBe(0)
    expect((v >>> 20) & 31).toBe(14)
    expect((v >>> 15) & 31).toBe(13)
    expect((v >>> 10) & 31).toBe(12)
    expect((v >>> 5) & 31).toBe(11)
    expect(v & 31).toBe(9)
  })

  it('7 张同花存在但顺子更大时取顺子（同花 5 张含顺 → 同花顺）', () => {
    // As Ks Qs Js Ts + 2 张杂牌 → 皇家
    expect(gradeOf(ev7('As Ks Qs Js Ts 2c 3h'))).toBe(8)
  })

  it('eval7Fast 与 evaluate7 结果一致', () => {
    const s = 'As Ah Ks Kh 5d 5c Qs'
    expect(ev7i(s)).toBe(ev7(s))
  })
})

describe('eval5Fast 快速接口', () => {
  it('与 evaluate5 结果一致（随机抽查）', () => {
    const idx = (s: string) => {
      const c = (s.length ? parseCards([s]) : [])[0]
      return (c.r - 2) * 4 + ['s', 'h', 'd', 'c'].indexOf(c.s)
    }
    // As Ks Qs Js Ts
    expect(eval5Fast(idx('As'), idx('Ks'), idx('Qs'), idx('Js'), idx('Ts'))).toBe(ev5('As Ks Qs Js Ts'))
    // Ah 2c 3d 4s 5h
    expect(eval5Fast(idx('Ah'), idx('2c'), idx('3d'), idx('4s'), idx('5h'))).toBe(ev5('Ah 2c 3d 4s 5h'))
    // As Ah Ks Kh Qd
    expect(eval5Fast(idx('As'), idx('Ah'), idx('Ks'), idx('Kh'), idx('Qd'))).toBe(ev5('As Ah Ks Kh Qd'))
  })
})

describe('参数校验', () => {
  it('evaluate5 拒绝非 5 张', () => {
    expect(() => evaluate5(parseCards(['As', 'Ks', 'Qs', 'Js']))).toThrow()
    expect(() => evaluate5(parseCards(['As', 'Ks', 'Qs', 'Js', 'Ts', '9s']))).toThrow()
  })

  it('evaluate7 拒绝非 7 张', () => {
    expect(() => evaluate7(parseCards(['As', 'Ks', 'Qs', 'Js', 'Ts', '9s']))).toThrow()
    expect(() => evaluate7(parseCards(['As', 'Ks', 'Qs', 'Js', 'Ts', '9s', '8s', '7s']))).toThrow()
  })
})
