/**
 * 模块一：胜率计算器
 *
 * 功能：
 * - 选择我的 2 张手牌 + 已翻公共牌（0~5 张）
 * - 选择对手范围：教学版预设（参考 GTO Wizard 公开翻前形状）或一键顶 10%/20%/50%
 * - 模拟次数：1 万 / 10 万 / 50 万（蒙特卡洛在 Web Worker 中运行，不阻塞 UI）
 * - 展示：胜率% / 平率% / 败率% / 进度条 / 运行耗时（同时输出到控制台）
 */
import { useMemo, useRef, useState } from 'react'
import CardPicker, { toDisabledStrings } from '../components/CardPicker'
import PlayingCard from '../components/PlayingCard'
import RangeGrid from '../components/RangeGrid'
import { Card, cardToString } from '../core/cards'
import { EquityResult } from '../core/equity'
import { RANGE_PRESETS, topXPercent } from '../core/presets'
import { GridSelection, totalCombos } from '../core/ranges'
import { useAppStore } from '../stores/appStore'

/** 选牌目标：区域 + 槽位 */
interface Picking {
  area: 'hole' | 'board'
  slot: number
}

/** 范围选项（快捷 + 教学版预设） */
const QUICK_RANGES = [
  { id: 'top10', name: '顶 10% 范围', make: () => topXPercent(10) },
  { id: 'top20', name: '顶 20% 范围', make: () => topXPercent(20) },
  { id: 'top50', name: '顶 50% 范围', make: () => topXPercent(50) },
]

const ITER_OPTIONS = [
  { value: 10000, label: '1 万' },
  { value: 100000, label: '10 万' },
  { value: 500000, label: '50 万' },
]

function fmtPct(n: number, total: number): string {
  return total > 0 ? ((n / total) * 100).toFixed(2) + '%' : '—'
}

export default function EquityPage() {
  const [hole, setHole] = useState<(Card | null)[]>([null, null])
  const [board, setBoard] = useState<(Card | null)[]>([null, null, null, null, null])
  const [rangeId, setRangeId] = useState('top20')
  const [iterations, setIterations] = useState(10000)
  const [picking, setPicking] = useState<Picking | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<EquityResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const recordEquityRun = useAppStore((s) => s.recordEquityRun)

  // 当前范围与统计
  const { selection, rangeLabel } = useMemo(() => {
    const quick = QUICK_RANGES.find((q) => q.id === rangeId)
    if (quick) return { selection: quick.make(), rangeLabel: quick.name }
    const preset = RANGE_PRESETS.find((p) => p.id === rangeId)
    if (preset) return { selection: preset.selection, rangeLabel: `${preset.name}（${preset.note}）` }
    return { selection: {} as GridSelection, rangeLabel: '未知范围' }
  }, [rangeId])

  const combos = useMemo(() => totalCombos(selection), [selection])
  const rangePct = ((combos / 1326) * 100).toFixed(1)

  const holeReady = hole.every((c) => c !== null)

  // 选牌交互
  const allCards = [...hole, ...board]
  const disabledForPicking = useMemo(() => {
    // 编辑某槽位时，该槽位原牌可选（换牌），其余已占用的禁用
    const editing = picking
      ? (picking.area === 'hole' ? hole : board)[picking.slot]
      : null
    const others = allCards.filter((c) => c && c !== editing)
    return toDisabledStrings(others)
  }, [picking, hole, board, allCards])

  const pickCard = (card: Card) => {
    if (!picking) return
    if (picking.area === 'hole') {
      setHole((h) => h.map((c, i) => (i === picking.slot ? card : c)))
    } else {
      setBoard((b) => b.map((c, i) => (i === picking.slot ? card : c)))
    }
    setPicking(null)
  }

  const clearSlot = () => {
    if (!picking) return
    if (picking.area === 'hole') {
      setHole((h) => h.map((c, i) => (i === picking.slot ? null : c)))
    } else {
      setBoard((b) => b.map((c, i) => (i === picking.slot ? null : c)))
    }
    setPicking(null)
  }

  // 运行模拟（Web Worker）
  const start = () => {
    if (!holeReady) return
    const holeCards = hole as Card[]
    const boardCards = board.filter((c) => c !== null) as Card[]

    // 终止旧任务再开新任务
    workerRef.current?.terminate()
    const worker = new Worker(new URL('../workers/equity.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    setRunning(true)
    setProgress(0)
    setResult(null)
    setError(null)

    worker.onmessage = (ev: MessageEvent) => {
      const msg = ev.data
      if (msg.type === 'progress') {
        setProgress(msg.done / msg.total)
      } else if (msg.type === 'done') {
        setResult({ win: msg.win, tie: msg.tie, lose: msg.lose, elapsedMs: msg.elapsedMs })
        setProgress(1)
        setRunning(false)
        // 规范要求：控制台输出实测时间
        console.log(
          `[性能] ${msg.done ?? iterations} 次蒙特卡洛模拟耗时 ${msg.elapsedMs.toFixed(1)}ms（Web Worker 实测）`,
        )
        recordEquityRun(msg.done ?? iterations)
        worker.terminate()
        workerRef.current = null
      } else if (msg.type === 'error') {
        setError(msg.message)
        setRunning(false)
        worker.terminate()
        workerRef.current = null
      }
    }
    worker.onerror = () => {
      setError('计算线程异常，请重试')
      setRunning(false)
    }

    worker.postMessage({
      type: 'run',
      hole: holeCards.map(cardToString),
      board: boardCards.map(cardToString),
      villainRange: selection,
      iterations,
    })
  }

  const total = result ? result.win + result.tie + result.lose : 0

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-black text-gold tracking-wide">胜率计算器</h1>
        <p className="text-xs text-stone-400 mt-1">选择手牌与公共牌，用蒙特卡洛模拟对抗对手范围</p>
      </header>

      {/* ---------- 我的手牌 ---------- */}
      <section className="card-panel p-4">
        <h2 className="text-sm font-bold text-gold-light mb-3">我的手牌</h2>
        <div className="flex gap-3">
          {hole.map((c, i) => (
            <PlayingCard
              key={i}
              card={c}
              size={56}
              onClick={() => setPicking({ area: 'hole', slot: i })}
            />
          ))}
          {!holeReady && <p className="self-center text-xs text-stone-400">点击牌位选择 2 张手牌</p>}
        </div>
      </section>

      {/* ---------- 公共牌 ---------- */}
      <section className="card-panel p-4">
        <h2 className="text-sm font-bold text-gold-light mb-3">公共牌（已翻 0~5 张）</h2>
        <div className="flex gap-2">
          {board.map((c, i) => (
            <PlayingCard
              key={i}
              card={c}
              size={44}
              onClick={() => setPicking({ area: 'board', slot: i })}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-stone-500 px-0.5" style={{ width: 44 * 5 + 8 * 4 }}>
          <span className="w-[132px] text-center">翻牌</span>
          <span className="w-[44px] text-center">转牌</span>
          <span className="w-[44px] text-center">河牌</span>
        </div>
      </section>

      {/* ---------- 对手范围 ---------- */}
      <section className="card-panel p-4">
        <h2 className="text-sm font-bold text-gold-light mb-3">对手范围</h2>
        <select
          className="w-full min-h-[44px] rounded-xl bg-black/30 border border-gold/30 text-sm text-stone-100 px-3"
          value={rangeId}
          onChange={(e) => setRangeId(e.target.value)}
        >
          <optgroup label="快捷范围">
            {QUICK_RANGES.map((q) => (
              <option key={q.id} value={q.id}>{q.name}</option>
            ))}
          </optgroup>
          <optgroup label="教学版 · 翻前开局">
            {RANGE_PRESETS.filter((p) => p.category === '翻前开局').map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.note}</option>
            ))}
          </optgroup>
          <optgroup label="教学版 · 翻前对抗">
            {RANGE_PRESETS.filter((p) => p.category === '翻前对抗').map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.note}</option>
            ))}
          </optgroup>
        </select>

        <div className="flex items-center justify-between mt-2 text-xs text-stone-400">
          <span>{rangeLabel}</span>
          <span className="text-gold-light">{combos.toFixed(0)} 组合 · 约 {rangePct}%</span>
        </div>

        <div className="mt-3">
          <RangeGrid selection={selection} />
        </div>
      </section>

      {/* ---------- 模拟次数 ---------- */}
      <section className="card-panel p-4">
        <h2 className="text-sm font-bold text-gold-light mb-3">模拟次数</h2>
        <div className="seg">
          {ITER_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={iterations === o.value ? 'on' : ''}
              onClick={() => setIterations(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      {/* ---------- 运行按钮 ---------- */}
      <button
        type="button"
        className="btn-gold w-full text-base"
        disabled={!holeReady || running}
        onClick={start}
      >
        {running ? '模拟中…' : '开始模拟'}
      </button>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/50 border border-red-500/40 rounded-lg p-3">{error}</p>
      )}

      {/* ---------- 进度与结果 ---------- */}
      {(running || result) && (
        <section className="card-panel p-4 space-y-4">
          <div className="prog-track">
            <div className="prog-fill" style={{ width: `${(progress * 100).toFixed(1)}%` }} />
          </div>

          {result && (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-2xl font-black text-emerald-400">{fmtPct(result.win, total)}</div>
                  <div className="text-xs text-stone-400 mt-1">胜率</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-gold-light">{fmtPct(result.tie, total)}</div>
                  <div className="text-xs text-stone-400 mt-1">平率</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-red-400">{fmtPct(result.lose, total)}</div>
                  <div className="text-xs text-stone-400 mt-1">败率</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>模拟 {total.toLocaleString('zh-CN')} 手</span>
                <span className="text-gold-light">耗时 {result.elapsedMs.toFixed(1)}ms</span>
              </div>
            </>
          )}
        </section>
      )}

      {/* ---------- 选牌抽屉 ---------- */}
      {picking && (
        <CardPicker
          disabled={disabledForPicking}
          onPick={pickCard}
          onClear={picking.area === 'board' ? clearSlot : clearSlot}
          onClose={() => setPicking(null)}
          title={picking.area === 'hole' ? `选择手牌（第 ${picking.slot + 1} 张）` : '选择公共牌'}
        />
      )}
    </div>
  )
}
