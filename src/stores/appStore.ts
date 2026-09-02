/**
 * 全局状态（Zustand + localStorage 持久化）
 * - 当前 Tab
 * - 当日训练统计（仅保留最近 30 天，防止 localStorage 无限增长）
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TabId = 'home' | 'equity' | 'range' | 'fish' | 'review' | 'settings'

export interface DailyStat {
  /** 胜率计算次数 */
  equityRuns: number
  /** 累计模拟手数 */
  simulatedHands: number
}

interface AppState {
  tab: TabId
  setTab: (tab: TabId) => void
  /** 'YYYY-MM-DD' → 当日统计 */
  daily: Record<string, DailyStat>
  recordEquityRun: (iterations: number) => void
}

/** 本地日期 key（YYYY-MM-DD） */
export function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tab: 'home',
      setTab: (tab) => set({ tab }),
      daily: {},
      recordEquityRun: (iterations) => {
        const key = todayKey()
        const daily = { ...get().daily }
        // 清理 30 天前的旧数据
        const cutoff = Date.now() - 30 * 86400000
        for (const k of Object.keys(daily)) {
          if (new Date(k + 'T00:00:00').getTime() < cutoff) delete daily[k]
        }
        const prev = daily[key] ?? { equityRuns: 0, simulatedHands: 0 }
        daily[key] = {
          equityRuns: prev.equityRuns + 1,
          simulatedHands: prev.simulatedHands + iterations,
        }
        set({ daily })
      },
    }),
    {
      name: 'poker-trainer-store',
      version: 1,
    },
  ),
)
