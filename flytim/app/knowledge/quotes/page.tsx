'use client'

import { useEffect, useState } from 'react'
import { QuoteDTO } from '@/lib/types'

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteDTO[] | null>(null)
  const [text, setText] = useState('')
  const [source, setSource] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)

  async function load() {
    const res = await fetch('/api/quotes')
    setQuotes(await res.json())
  }

  useEffect(() => {
    load()
  }, [])

  async function add() {
    const t = text.trim()
    if (!t) return
    await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: t, source }),
    })
    setText('')
    setSource('')
    load()
  }

  async function copy(q: QuoteDTO) {
    try {
      await navigator.clipboard.writeText(q.text)
      setCopiedId(q.id)
      setTimeout(() => setCopiedId(null), 1200)
    } catch {
      // 剪贴板不可用时忽略
    }
  }

  async function del(q: QuoteDTO) {
    if (!window.confirm('删除这条金句？')) return
    await fetch(`/api/quotes/${q.id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-700">存一句</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add()
            }}
            placeholder="写稿时冒出来的好句子…"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
          />
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="出处（可空）"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-amber-500 sm:w-44"
          />
          <button
            onClick={add}
            className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400"
          >
            保存
          </button>
        </div>
      </section>

      {quotes === null ? (
        <p className="py-10 text-center text-sm text-zinc-400">加载中…</p>
      ) : quotes.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-400">还没有金句</p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {quotes.map((q) => (
            <li key={q.id} className="flex items-center gap-3 px-4 py-3">
              <p className="min-w-0 flex-1 text-sm leading-6 text-zinc-900">{q.text}</p>
              {q.source && (
                <span className="hidden shrink-0 text-xs text-zinc-400 sm:inline">
                  —— {q.source}
                </span>
              )}
              <button
                onClick={() => copy(q)}
                className="shrink-0 rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-900"
              >
                {copiedId === q.id ? '已复制 ✓' : '复制'}
              </button>
              <button
                onClick={() => del(q)}
                className="shrink-0 text-xs text-zinc-300 hover:text-red-500"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
