/** 底部 Tab 导航（6 个模块，移动端竖屏优先，触控区 ≥ 44px） */
import { TabId, useAppStore } from '../stores/appStore'

interface TabDef {
  id: TabId
  label: string
  icon: JSX.Element
}

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d={d} />
  </svg>
)

const TABS: TabDef[] = [
  { id: 'home', label: '首页', icon: icon('M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5') },
  { id: 'equity', label: '胜率', icon: icon('M4 20V10M10 20V4M16 20v-8M22 20H2') },
  { id: 'range', label: '范围', icon: icon('M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z') },
  { id: 'fish', label: '鱼塘', icon: icon('M6.5 12c.9-3.6 4-6 8.5-6 3 0 5.5 1.4 6.5 3-1 1.6-3.5 3-6.5 3-1 2.5-3.5 4-6.5 4-1 0-2-.2-2.8-.6M4 15c.8-1 2-1.4 3.5-1M15 9.5h.01M8.5 8.5l-2-2M13.5 6.5l-.8-2.2') },
  { id: 'review', label: '复盘', icon: icon('M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2zM8 7h7M8 11h7M8 15h4') },
  { id: 'settings', label: '设置', icon: icon('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.12-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.12 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1z') },
]

export default function TabBar() {
  const tab = useAppStore((s) => s.tab)
  const setTab = useAppStore((s) => s.setTab)

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-felt-deep/95 backdrop-blur border-t border-gold/25"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-md mx-auto grid grid-cols-6">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] transition-colors ${
                active ? 'text-gold' : 'text-stone-400'
              }`}
              aria-label={t.label}
            >
              {t.icon}
              <span className={`text-[10px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
