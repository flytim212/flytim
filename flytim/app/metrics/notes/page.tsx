'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MetricDTO } from '@/lib/types'
import { formatDateCN } from '@/lib/format'

export default function NotesPage() {
  const [records, setRecords] = useState<MetricDTO[] | null>(null)
  const [editing, setEditing] = useState<{ id: number; text: string } | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/metrics')
      .then((r) => r.json())
      .then(setRecords)
  }, [])

  // 有备注的记录，日期倒序
  const notes = useMemo(
    () => (records ?? []).filter((r) => r.iterationNote.trim() !== ''),
    [records],
  )

  async function saveNote() {
    if (!editing) return
    setSavingId(editing.id)
    await fetch(`/api/metrics/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iterationNote: editing.text }),
    })
    setSavingId(null)
    setEditing(null)
    const rs = await fetch('/api/metrics').then((r) => r.json())
    setRecords(rs)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/metrics"
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← 数据中心
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">迭代日志</h1>
        <span className="text-sm text-zinc-400">{notes.length} 条</span>
      </div>
      <p className="text-xs text-zinc-400">
        每条爆了 / 扑了的视频，写一句「为什么」——这是反馈循环。
      </p>

      {records === null ? (
        <p className="py-10 text-center text-sm text-zinc-400">加载中…</p>
      ) : notes.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-400">
          还没有迭代日志——录数据时写一句「为什么」
        </p>
      ) : (
        <ul className="space-y-3">
          {notes.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="text-zinc-500">{formatDateCN(m.date)}</span>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-zinc-500">
                  {m.platform}
                </span>
                <span className="truncate text-zinc-900">
                  {m.content.topic.title}
                </span>
                <span className="text-zinc-300">·</span>
                <span className="text-zinc-400">
                  播放 {m.views} · 赞 {m.likes}
                </span>
                <button
                  onClick={() =>
                    setEditing({ id: m.id, text: m.iterationNote })
                  }
                  className="ml-auto text-zinc-400 hover:text-zinc-900"
                >
                  编辑
                </button>
              </div>
              {editing?.id === m.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={editing.text}
                    onChange={(e) =>
                      setEditing({ id: m.id, text: e.target.value })
                    }
                    rows={3}
                    className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveNote}
                      disabled={savingId === m.id}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
                    >
                      {savingId === m.id ? '保存中…' : '保存'}
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-900"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                  {m.iterationNote}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
