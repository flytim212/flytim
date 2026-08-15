'use client'

import { useEffect, useMemo, useState } from 'react'
import { SOURCE_STATUSES, SOURCE_TYPES } from '@/lib/constants'
import { SourceDTO } from '@/lib/types'

const INPUT_CLS =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500'

const TYPE_STYLE: Record<string, string> = {
  书籍: 'border-amber-200 bg-amber-50 text-amber-700',
  视频: 'border-rose-200 bg-rose-50 text-rose-700',
  课程: 'border-sky-200 bg-sky-50 text-sky-700',
  文章: 'border-violet-200 bg-violet-50 text-violet-700',
  播客: 'border-teal-200 bg-teal-50 text-teal-700',
  其他: 'border-zinc-200 bg-zinc-100 text-zinc-500',
}

const STATUS_STYLE: Record<string, string> = {
  待处理: 'text-zinc-400',
  进行中: 'text-sky-600',
  已完成: 'text-emerald-600',
}

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceDTO[] | null>(null)
  const [type, setType] = useState('全部')
  const [q, setQ] = useState('')

  // 单条导入
  const [form, setForm] = useState({
    type: '书籍',
    title: '',
    author: '',
    url: '',
    description: '',
  })
  // 批量导入：每行 `类型 | 标题 | 作者 | 链接`（类型可省略，默认书籍）
  const [batch, setBatch] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const [editing, setEditing] = useState<{ id: number; status: string; notes: string } | null>(null)

  async function load() {
    const params = new URLSearchParams()
    if (type !== '全部') params.set('type', type)
    if (q.trim()) params.set('q', q.trim())
    const res = await fetch(`/api/sources?${params}`)
    setSources(await res.json())
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  const filtered = useMemo(
    () => (sources ?? []).filter((s) => !q.trim() || s.title.includes(q) || s.author.includes(q)),
    [sources, q],
  )

  async function addOne() {
    if (!form.title.trim()) {
      setMsg('标题不能为空')
      return
    }
    setSaving(true)
    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) {
      setMsg('导入失败')
      return
    }
    setForm({ type: form.type, title: '', author: '', url: '', description: '' })
    setMsg('已导入 ✓')
    load()
  }

  async function addBatch() {
    const items = batch
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split('|').map((p) => p.trim())
        // 第一段是合法类型 → 有类型；否则默认书籍
        const hasType = (SOURCE_TYPES as readonly string[]).includes(parts[0])
        return {
          type: hasType ? parts[0] : '书籍',
          title: hasType ? parts[1] : parts[0],
          author: hasType ? parts[2] ?? '' : parts[1] ?? '',
          url: hasType ? parts[3] ?? '' : parts[2] ?? '',
        }
      })
      .filter((i) => i.title)
    if (items.length === 0) {
      setMsg('没有可导入的行')
      return
    }
    setSaving(true)
    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    setSaving(false)
    const data = await res.json()
    if (!res.ok) {
      setMsg(data.error || '导入失败')
      return
    }
    setBatch('')
    setMsg(`批量导入 ${data.created} 条 ✓`)
    load()
  }

  async function saveEdit() {
    if (!editing) return
    await fetch(`/api/sources/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: editing.status, notes: editing.notes }),
    })
    setEditing(null)
    load()
  }

  async function del(s: SourceDTO) {
    if (!window.confirm(`删除「${s.title}」？`)) return
    await fetch(`/api/sources/${s.id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 导入区 */}
      <section className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-5 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium text-zinc-700">导入一条</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-zinc-400">类型</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className={INPUT_CLS}
              >
                {SOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-400">标题 *</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={INPUT_CLS}
                placeholder="书名 / 视频标题"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-400">作者 / UP主</span>
              <input
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                className={INPUT_CLS}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-400">链接</span>
              <input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className={INPUT_CLS}
                placeholder="https://…"
              />
            </label>
          </div>
          <div className="mt-3 space-y-1">
            <span className="text-xs text-zinc-400">简介</span>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={INPUT_CLS}
            />
          </div>
          <button
            onClick={addOne}
            disabled={saving}
            className="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
          >
            导入
          </button>
        </div>

        <div className="border-t border-zinc-100 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <h2 className="text-sm font-medium text-zinc-700">批量导入</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            每行一条：<code className="rounded bg-zinc-100 px-1">类型 | 标题 | 作者 | 链接</code>
            ，类型可省略（默认书籍）
          </p>
          <textarea
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            rows={5}
            placeholder={'视频 | Leong：为什么我停更三个月 | Leong | https://…\n《心流》 | 米哈里'}
            className="mt-2 w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs leading-6 outline-none focus:border-amber-500"
          />
          <button
            onClick={addBatch}
            disabled={saving}
            className="mt-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-zinc-500 disabled:opacity-50"
          >
            批量导入
          </button>
        </div>
        {msg && <p className="text-xs text-emerald-600 lg:col-span-2">{msg}</p>}
      </section>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        {['全部', ...SOURCE_TYPES].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
              type === t ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {t}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索标题/作者…"
          className="ml-auto w-40 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-amber-500"
        />
      </div>

      {/* 列表 */}
      {sources === null ? (
        <p className="py-10 text-center text-sm text-zinc-400">加载中…</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-400">
          还没有资源，从上方导入第一批
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtered.map((s) => (
            <li key={s.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${TYPE_STYLE[s.type] ?? TYPE_STYLE['其他']}`}
                >
                  {s.type}
                </span>
                <button
                  onClick={() => {
                    const next = SOURCE_STATUSES[
                      (SOURCE_STATUSES.indexOf(s.status as (typeof SOURCE_STATUSES)[number]) + 1) %
                        SOURCE_STATUSES.length
                    ]
                    setEditing({ id: s.id, status: next, notes: s.notes })
                  }}
                  className={`text-xs ${STATUS_STYLE[s.status] ?? ''} hover:underline`}
                  title="点击切换状态"
                >
                  {s.status}
                </button>
                {s.tags && (
                  <span className="ml-auto text-xs text-zinc-400">{s.tags}</span>
                )}
              </div>
              <h3 className="mt-2 font-medium leading-6 text-zinc-900">
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-amber-600 hover:underline"
                  >
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
              </h3>
              {s.author && <p className="text-xs text-zinc-400">{s.author}</p>}
              {s.description && (
                <p className="mt-1 text-sm leading-6 text-zinc-500">{s.description}</p>
              )}
              {editing?.id === s.id ? (
                <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
                  <textarea
                    value={editing.notes}
                    onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                    rows={2}
                    placeholder="笔记…"
                    className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-400"
                    >
                      保存
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
                s.notes && (
                  <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs leading-5 text-zinc-500">
                    {s.notes}
                  </p>
                )
              )}
              <div className="mt-3 flex gap-3 text-xs">
                <button
                  onClick={() => setEditing({ id: s.id, status: s.status, notes: s.notes })}
                  className="text-zinc-500 hover:text-zinc-900"
                >
                  记笔记
                </button>
                <button onClick={() => del(s)} className="text-zinc-400 hover:text-red-500">
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
