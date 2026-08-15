'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CARD_STATUSES } from '@/lib/constants'
import { CardDTO } from '@/lib/types'

const STATUS_STYLE: Record<string, string> = {
  待补经历: 'border-red-200 bg-red-50 text-red-600',
  可写稿: 'border-sky-200 bg-sky-50 text-sky-700',
  已发布: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

export default function CardsPage() {
  const [cards, setCards] = useState<CardDTO[] | null>(null)
  const [status, setStatus] = useState('全部')
  const [q, setQ] = useState('')

  const [form, setForm] = useState({ title: '', oneLiner: '', source: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/cards')
    setCards(await res.json())
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(
    () =>
      (cards ?? []).filter(
        (c) =>
          (status === '全部' || c.status === status) &&
          (!q.trim() ||
            c.title.includes(q) ||
            c.oneLiner.includes(q) ||
            c.keyPoints.includes(q) ||
            c.source.includes(q)),
      ),
    [cards, status, q],
  )

  async function add() {
    if (!form.title.trim()) {
      setError('标题不能为空')
      return
    }
    setSaving(true)
    const res = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) {
      setError('保存失败')
      return
    }
    setForm({ title: '', oneLiner: '', source: '' })
    setError('')
    load()
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 新建 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-700">新建概念卡</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="概念名 *（如：课题分离）"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
          />
          <input
            value={form.oneLiner}
            onChange={(e) => setForm({ ...form, oneLiner: e.target.value })}
            placeholder="一句话版本"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
          />
          <input
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            placeholder="来源（书名/课程）"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={add}
            disabled={saving}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
          >
            创建
          </button>
          {error && <span className="text-xs text-red-500">{error}</span>}
          <span className="text-xs text-zinc-400">
            核心要点 / 经历 / 话术在详情页补全
          </span>
        </div>
      </section>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        {['全部', ...CARD_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
              status === s ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {s}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="全文搜索…"
          className="ml-auto w-44 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-amber-500"
        />
      </div>

      {/* 卡片网格 */}
      {cards === null ? (
        <p className="py-10 text-center text-sm text-zinc-400">加载中…</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-400">没有概念卡</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <li key={c.id} className="relative">
              <Link
                href={`/knowledge/cards/${c.id}`}
                className="block h-full rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400"
              >
                {c.status === '待补经历' && (
                  <span className="absolute right-3 top-3 flex h-3 w-3">
                    <span className="h-3 w-3 rounded-full bg-red-500" title="待补经历" />
                  </span>
                )}
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[c.status] ?? ''}`}
                >
                  {c.status}
                </span>
                <h3 className="mt-2 font-medium leading-6 text-zinc-900">{c.title}</h3>
                {c.oneLiner && (
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-500">
                    {c.oneLiner}
                  </p>
                )}
                {c.source && <p className="mt-2 text-xs text-zinc-400">来源：{c.source}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
