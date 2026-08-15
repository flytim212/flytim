'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CARD_STATUSES } from '@/lib/constants'
import { CardDTO, TopicDTO } from '@/lib/types'

type FullCard = CardDTO & { topics: Pick<TopicDTO, 'id' | 'title' | 'status'>[] }

const INPUT_CLS =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500'

export default function CardDetail({ id }: { id: number }) {
  const [card, setCard] = useState<FullCard | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState('')
  const lastSavedRef = useRef('')
  const loadedRef = useRef(false)
  const [converting, setConverting] = useState(false)

  async function load() {
    const res = await fetch(`/api/cards/${id}`)
    if (!res.ok) {
      setNotFound(true)
      return
    }
    const data: FullCard = await res.json()
    setCard(data)
    lastSavedRef.current = JSON.stringify(data)
    loadedRef.current = true
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const patch = useCallback(
    async (update: Record<string, string>) => {
      if (!card) return
      const next = { ...card, ...update }
      setCard(next)
      setSaving(true)
      const res = await fetch(`/api/cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
      setSaving(false)
      if (res.ok) {
        setSavedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
        lastSavedRef.current = JSON.stringify(next)
      }
    },
    [card, id],
  )

  // 停止编辑 800ms 后自动保存
  useEffect(() => {
    if (!loadedRef.current || !card) return
    const snapshot = JSON.stringify(card)
    if (snapshot === lastSavedRef.current) return
    const timer = setTimeout(() => {
      const { topics, ...fields } = card
      void topics
      patch(fields as unknown as Record<string, string>)
    }, 800)
    return () => clearTimeout(timer)
  }, [card, patch])

  async function toTopic() {
    if (!card) return
    setConverting(true)
    const res = await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: card.title,
        hook: card.scriptDraft || card.oneLiner,
        category: '方法',
        linkedCardId: card.id,
      }),
    })
    setConverting(false)
    if (res.ok) load()
  }

  async function del() {
    if (!card || !window.confirm(`删除概念卡「${card.title}」？`)) return
    await fetch(`/api/cards/${id}`, { method: 'DELETE' })
    window.location.href = '/knowledge/cards'
  }

  if (notFound) {
    return (
      <div className="py-16 text-center">
        <p className="text-zinc-500">概念卡不存在</p>
        <Link href="/knowledge/cards" className="mt-3 inline-block text-sm text-amber-600 hover:underline">
          ← 返回概念卡
        </Link>
      </div>
    )
  }
  if (!card) return <p className="py-16 text-center text-sm text-zinc-400">加载中…</p>

  const saveLabel = saving ? '保存中…' : savedAt ? `已保存 ${savedAt}` : ''

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/knowledge/cards" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← 概念卡
        </Link>
        <div className="flex items-center gap-2">
          {CARD_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => patch({ status: s })}
              className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
                card.status === s
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-400">{saveLabel}</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={toTopic}
            disabled={converting}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
          >
            {converting ? '转换中…' : '转为选题'}
          </button>
          <button onClick={del} className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-red-500">
            删除
          </button>
        </div>
      </div>

      <input
        value={card.title}
        onChange={(e) => setCard({ ...card, title: e.target.value })}
        className="w-full border-0 bg-transparent text-xl font-semibold text-zinc-900 outline-none"
        placeholder="概念名"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-500">一句话版本</span>
            <input
              value={card.oneLiner}
              onChange={(e) => setCard({ ...card, oneLiner: e.target.value })}
              className={INPUT_CLS}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-500">来源</span>
            <input
              value={card.source}
              onChange={(e) => setCard({ ...card, source: e.target.value })}
              className={INPUT_CLS}
              placeholder="书名 / 课程 / 视频"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-500">核心要点（一行一条）</span>
            <textarea
              value={card.keyPoints}
              onChange={(e) => setCard({ ...card, keyPoints: e.target.value })}
              rows={5}
              className={`${INPUT_CLS} resize-none leading-6`}
            />
          </label>
        </div>
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-500">
              我的真实经历{card.status === '待补经历' && <span className="ml-1 text-red-500">（待补）</span>}
            </span>
            <textarea
              value={card.myExperience}
              onChange={(e) => setCard({ ...card, myExperience: e.target.value })}
              rows={4}
              placeholder="没有经历，这张卡就不成立"
              className={`${INPUT_CLS} resize-none leading-6`}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-500">口播话术草稿</span>
            <textarea
              value={card.scriptDraft}
              onChange={(e) => setCard({ ...card, scriptDraft: e.target.value })}
              rows={3}
              placeholder="这条视频我会怎么开口说第一句…"
              className={`${INPUT_CLS} resize-none leading-6`}
            />
          </label>
        </div>
      </div>

      {card.topics.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-xs font-medium text-zinc-500">关联选题</h2>
          <ul className="mt-2 space-y-1">
            {card.topics.map((t) => (
              <li key={t.id} className="text-sm text-zinc-700">
                <Link href="/topics" className="hover:text-amber-600 hover:underline">
                  {t.title}
                </Link>
                <span className="ml-2 text-xs text-zinc-400">{t.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
