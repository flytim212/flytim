'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ContentDTO } from '@/lib/types'

type Item = ContentDTO & {
  topic: { id: number; title: string; category: string; status: string }
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function keyOf(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState({
    y: today.getFullYear(),
    m: today.getMonth(),
  })
  const [contents, setContents] = useState<Item[] | null>(null)

  useEffect(() => {
    fetch('/api/contents')
      .then((r) => r.json())
      .then(setContents)
  }, [])

  // 已发布 → 显示在实际发布日（绿）；未发布 → 显示在计划日（黄，过期即断更信号）
  const byDay = useMemo(() => {
    const map = new Map<
      string,
      { id: number; title: string; kind: 'planned' | 'published' }[]
    >()
    const push = (
      key: string,
      item: { id: number; title: string; kind: 'planned' | 'published' },
    ) => {
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    for (const c of contents ?? []) {
      if (c.publishedDate) {
        push(c.publishedDate.slice(0, 10), {
          id: c.id,
          title: c.topic.title,
          kind: 'published',
        })
      } else if (c.plannedDate) {
        push(c.plannedDate.slice(0, 10), {
          id: c.id,
          title: c.topic.title,
          kind: 'planned',
        })
      }
    }
    return map
  }, [contents])

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1)
    const offset = (first.getDay() + 6) % 7 // 周一开头
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
    const total = Math.ceil((offset + daysInMonth) / 7) * 7
    return Array.from(
      { length: total },
      (_, i) => new Date(cursor.y, cursor.m, 1 - offset + i),
    )
  }, [cursor])

  const stats = useMemo(() => {
    let published = 0
    let planned = 0
    for (const cell of cells) {
      if (cell.getMonth() !== cursor.m) continue
      for (const item of byDay.get(keyOf(cell)) ?? []) {
        if (item.kind === 'published') published++
        else planned++
      }
    }
    return { published, planned }
  }, [cells, byDay, cursor.m])

  function move(delta: number) {
    const d = new Date(cursor.y, cursor.m + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">发布日历</h1>
        <span className="text-sm text-zinc-500">
          已发布 {stats.published} 条 · 计划/待发布 {stats.planned} 条
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => move(-1)}
            className="h-8 w-8 rounded-lg border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            ‹
          </button>
          <span className="min-w-[6.5rem] text-center text-sm">
            {cursor.y} 年 {cursor.m + 1} 月
          </span>
          <button
            onClick={() => move(1)}
            className="h-8 w-8 rounded-lg border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            ›
          </button>
          <button
            onClick={() =>
              setCursor({ y: today.getFullYear(), m: today.getMonth() })
            }
            className="rounded-lg border border-zinc-800 px-2.5 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            今天
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          计划发布
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          已发布
        </span>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="bg-zinc-900 py-2 text-center text-xs text-zinc-500"
          >
            {w}
          </div>
        ))}
        {cells.map((cell) => {
          const key = keyOf(cell)
          const inMonth = cell.getMonth() === cursor.m
          const isToday = key === keyOf(today)
          const items = byDay.get(key) ?? []
          return (
            <div
              key={key}
              className={`min-h-[86px] bg-zinc-950 p-1.5 sm:min-h-[110px] ${
                inMonth ? '' : 'opacity-40'
              }`}
            >
              <div
                className={`mx-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? 'bg-amber-500/90 font-semibold text-zinc-950'
                    : 'text-zinc-500'
                }`}
              >
                {cell.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {items.map((it) => (
                  <Link
                    key={`${key}-${it.id}`}
                    href={`/contents/${it.id}`}
                    title={it.title}
                    className="flex items-center gap-1.5 rounded-md bg-zinc-900/80 px-1.5 py-1 text-[11px] leading-4 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        it.kind === 'published'
                          ? 'bg-emerald-400'
                          : 'bg-amber-400'
                      }`}
                    />
                    <span className="truncate">{it.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
