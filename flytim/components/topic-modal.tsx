'use client'

import { useEffect, useState } from 'react'
import { CATEGORIES, TOPIC_STATUSES } from '@/lib/constants'
import { CaseDTO, TopicDTO } from '@/lib/types'

export default function TopicModal({
  topic,
  onClose,
  onSaved,
}: {
  topic: TopicDTO | null // null = 新建
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(topic?.title ?? '')
  const [hook, setHook] = useState(topic?.hook ?? '')
  const [category, setCategory] = useState<string>(topic?.category ?? '故事')
  const [status, setStatus] = useState<string>(topic?.status ?? '待写')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [suggests, setSuggests] = useState<CaseDTO[]>([])

  // 新建时拉取「可用作选题」的案例建议
  useEffect(() => {
    if (topic) return
    fetch('/api/cases?usable=true')
      .then((r) => r.json())
      .then((d: CaseDTO[]) => setSuggests(d.slice(0, 5)))
      .catch(() => {})
  }, [topic])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit() {
    if (!title.trim()) {
      setError('标题不能为空')
      return
    }
    setSaving(true)
    const res = await fetch(topic ? `/api/topics/${topic.id}` : '/api/topics', {
      method: topic ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, hook, category, status }),
    })
    setSaving(false)
    if (!res.ok) {
      setError('保存失败，请重试')
      return
    }
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-t-2xl border border-zinc-200 bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-medium text-zinc-900">
          {topic ? '编辑选题' : '新建选题'}
        </h2>

        {!topic && suggests.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-zinc-400">来自案例库的建议（点击采用）：</p>
            <div className="flex flex-wrap gap-1.5">
              {suggests.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setTitle(c.trigger)
                    setHook(c.bodySignal ? `那天${c.bodySignal}。` : '')
                    setCategory('故事')
                  }}
                  className="max-w-full truncate rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600 hover:border-amber-400 hover:text-amber-700"
                  title={c.trigger}
                >
                  {c.emotionType} · {c.trigger}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-zinc-400">标题 *</label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setError('')
            }}
            autoFocus
            placeholder="一句话说清这条内容讲什么"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-400">开头钩子（前 3 秒）</label>
          <textarea
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            rows={2}
            placeholder="第一句话怎么说，让人停下来"
            className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">分类</label>
            <div className="flex gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
                    category === c
                      ? 'bg-amber-500 font-medium text-white'
                      : 'border border-zinc-300 text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">状态</label>
            <div className="flex flex-wrap gap-1">
              {TOPIC_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
                    status === s
                      ? 'bg-zinc-900 font-medium text-white'
                      : 'border border-zinc-300 text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-900"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
