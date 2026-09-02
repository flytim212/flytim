/**
 * 首页：训练入口卡片 + 当日训练数据统计 + 底部固定免责声明（合规硬性要求）
 */
import { TabId, todayKey, useAppStore } from '../stores/appStore'

interface ModuleCard {
  tab: TabId
  title: string
  desc: string
  status: 'ready' | 'soon'
  stage?: string
}

const MODULES: ModuleCard[] = [
  { tab: 'equity', title: '胜率计算器', desc: '手牌对抗范围的蒙特卡洛胜率模拟', status: 'ready' },
  { tab: 'range', title: '范围训练', desc: '169 格范围记忆与位置练习', status: 'soon', stage: '阶段 2' },
  { tab: 'fish', title: '鱼塘对练', desc: '人机对局练习，用虚拟筹码决策训练', status: 'soon', stage: '阶段 3' },
  { tab: 'review', title: '复盘工具', desc: '对局记录回放与决策复盘', status: 'soon', stage: '阶段 4' },
]

export default function HomePage() {
  const setTab = useAppStore((s) => s.setTab)
  const today = useAppStore((s) => s.daily[todayKey()])

  return (
    <div className="flex flex-col min-h-[calc(100dvh-8.5rem)]">
      {/* ---------- 头部 ---------- */}
      <header className="pt-6 pb-5 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black/25 border border-gold/40 shadow-card">
          <span className="text-4xl text-gold leading-none">♠</span>
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-widest text-gold">德扑训练器</h1>
        <p className="mt-1 text-xs text-stone-400 tracking-[0.3em]">单机 · 离线 · 纯策略练习</p>
      </header>

      {/* ---------- 当日训练统计 ---------- */}
      <section className="card-panel p-4 mb-4">
        <h2 className="text-sm font-bold text-gold-light mb-3">今日训练</h2>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-black/25 py-3">
            <div className="text-2xl font-black text-gold-light">{today?.equityRuns ?? 0}</div>
            <div className="text-xs text-stone-400 mt-1">胜率计算次数</div>
          </div>
          <div className="rounded-xl bg-black/25 py-3">
            <div className="text-2xl font-black text-gold-light">
              {((today?.simulatedHands ?? 0) / 10000).toFixed(1)}<span className="text-sm"> 万</span>
            </div>
            <div className="text-xs text-stone-400 mt-1">累计模拟手数</div>
          </div>
        </div>
      </section>

      {/* ---------- 训练模块入口 ---------- */}
      <section className="space-y-3">
        {MODULES.map((m) => (
          <button
            key={m.tab}
            type="button"
            onClick={() => setTab(m.tab)}
            className="card-panel w-full flex items-center justify-between p-4 text-left active:translate-y-px transition-transform"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-100">{m.title}</span>
                {m.status === 'ready' ? (
                  <span className="text-[10px] font-bold text-emerald-900 bg-emerald-400 rounded px-1.5 py-0.5">可用</span>
                ) : (
                  <span className="text-[10px] font-bold text-stone-900 bg-stone-400 rounded px-1.5 py-0.5">{m.stage} 开放</span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-1">{m.desc}</p>
            </div>
            <span className="text-gold/70 text-xl">›</span>
          </button>
        ))}
      </section>

      {/* ---------- 底部固定免责声明（合规硬性要求） ---------- */}
      <footer className="mt-auto pt-6 pb-2">
        <p className="text-center text-[11px] leading-relaxed text-stone-500 border-t border-white/10 pt-4">
          本软件为纯单机训练工具，不涉及任何真实金钱对局，仅用于策略学习
        </p>
      </footer>
    </div>
  )
}
