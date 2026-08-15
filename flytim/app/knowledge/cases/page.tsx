'use client'

import { useEffect, useState } from 'react'
import { EMOTION_TYPES } from '@/lib/constants'
import { CaseDTO } from '@/lib/types'
import { toDateInputValue, formatDateCN } from '@/lib/format'

const INPUT_CLS =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500'

const EMOTION_STYLE: Record<string, string> = {
  焦虑: 'border-amber-200 bg-amber-50 text-amber-700',
  愤怒: 'border-red-200 bg-red-50 text-red-600',
  悲伤: 'border-sky-200 bg-sky-50 text-sky-700',
  恐惧: 'border-violet-200 bg-violet-50 text-violet-700',
  羞愧: 'border-pink-200 bg-pink-50 text-pink-700',
  内疚: 'border-pink-200 bg-pink-50 text-pink-700',
  无力: 'border-zinc-200 bg-zinc-100 text-zinc-500',
  喜悦: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  平静: 'border-teal-200 bg-teal-50 text-teal-700',
  其他: 'border-zinc-200 bg-zinc-100 text-zinc-500',
}

const EMPTY = {
  date: '',
  trigger: '',
  emotionType: '焦虑',
  bodySignal: '',
  action: '',
  result: '',
  usableAsTopic: false,
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseDTO[] | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [editing, setEditing] = useState<CaseDTO | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/cases')
    setCases(await res.json())
  }

  useEffect(() => {
    load()
  }, [])

  async function save() {
    const payload = editing
      ? { ...form, date: form.date || toDateInputValue(editing.date) }
      : { ...form, date: form.date || new Date().toISOString().slice(0, 10) }
    if (!payload.trigger.trim()) {
      setError('触发事件不能为空')
      return
    }
    setSaving(true)
    const res = await fetch(editing ? `/api/cases/${editing.id}` : '/api/cases', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      setError('保存失败')
      return
    }
    setError('')
    setForm({ ...EMPTY })
    setEditing(null)
    load()
  }

  async function toggleUsable(c: CaseDTO) {
    await fetch(`/api/cases/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usableAsTopic: !c.usableAsTopic }),
    })
    load()
  }

  async function del(c: CaseDTO) {
    if (!window.confirm(`删除这条「${c.emotionType}」案例？`)) return
    await fetch(`/api/cases/${c.id}`, { method: 'DELETE' })
    load()
  }

  function startEdit(c: CaseDTO) {
    setEditing(c)
    setForm({
      date: toDateInputValue(c.date),
      trigger: c.trigger,
      emotionType: c.emotionType,
      bodySignal: c.bodySignal,
      action: c.action,
      result: c.result,
      usableAsTopic: c.usableAsTopic,
    })
    window.scrollTo({ top: 0 })
  }

  const current = editing ?? form

  return (
    <div className="flex flex-col gap-5">
      {/* 记录表单 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-700">
          {editing ? '编辑案例' : '记一条情绪案例'}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">日期</span>
            <input
              type="date"
              value={current.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={INPUT_CLS}
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs text-zinc-400">触发事件 *</span>
            <input
              value={current.trigger}
              onChange={(e) => setForm({ ...form, trigger: e.target.value })}
              placeholder="发生了什么"
              className={INPUT_CLS}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">情绪类型</span>
            <select
              value={current.emotionType}
              onChange={(e) => setForm({ ...form, emotionType: e.target.value })}
              className={INPUT_CLS}
            >
              {EMOTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs text-zinc-400">身体信号</span>
            <input
              value={current.bodySignal}
              onChange={(e) => setForm({ ...form, bodySignal: e.target.value })}
              placeholder="胸口发紧 / 手心出汗…"
              className={INPUT_CLS}
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs text-zinc-400">当时行动</span>
            <input
              value={current.action}
              onChange={(e) => setForm({ ...form, action: e.target.value })}
              className={INPUT_CLS}
            />
          </label>
          <label className="space-y-1 sm:col-span-3">
            <span className="text-xs text-zinc-400">结果</span>
            <input
              value={current.result}
              onChange={(e) => setForm({ ...form, result: e.target.value })}
              className={INPUT_CLS}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={current.usableAsTopic}
              onChange={(e) => setForm({ ...form, usableAsTopic: e.target.checked })}
              className="h-4 w-4 accent-amber-500"
            />
            可用作选题
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存'}
          </button>
          {editing && (
            <button
              onClick={() => {
                setEditing(null)
                setForm({ ...EMPTY })
              }}
              className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900"
            >
              取消
            </button>
          )}
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </section>

      {/* 案例列表 */}
      {cases === null ? (
        <p className="py-10 text-center text-sm text-zinc-400">加载中…</p>
      ) : cases.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-400">还没有案例记录</p>
      ) : (
        <ul className="space-y-3">
          {cases.map((c) => (
            <li key={c.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-400">{formatDateCN(c.date)}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${EMOTION_STYLE[c.emotionType] ?? EMOTION_STYLE['其他']}`}
                >
                  {c.emotionType}
                </span>
                <span className="text-sm font-medium text-zinc-900">{c.trigger}</span>
                <button
                  onClick={() => toggleUsable(c)}
                  className={`ml-auto rounded-full border px-2 py-0.5 text-xs transition-colors ${
                    c.usableAsTopic
                      ? 'border-amber-300 bg-amber-50 text-amber-700'
                      : 'border-zinc-200 text-zinc-400 hover:text-zinc-600'
                  }`}
                  title="点击切换"
                >
                  {c.usableAsTopic ? '✓ 可用作选题' : '可作用题'}
                </button>
              </div>
              <div className="mt-2 grid gap-x-6 gap-y-1 text-xs leading-6 text-zinc-500 sm:grid-cols-3">
                {c.bodySignal && <p>身体：{c.bodySignal}</p>}
                {c.action && <p>行动：{c.action}</p>}
                {c.result && <p>结果：{c.result}</p>}
              </div>
              <div className="mt-2 flex gap-3 text-xs">
                <button onClick={() => startEdit(c)} className="text-zinc-500 hover:text-zinc-900">
                  编辑
                </button>
                <button onClick={() => del(c)} className="text-zinc-400 hover:text-red-500">
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
