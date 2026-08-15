'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES, TOPIC_STATUSES } from '@/lib/constants'
import { TopicDTO } from '@/lib/types'
import { formatDateCN } from '@/lib/format'
import { Badge, CATEGORY_STYLE, TOPIC_STATUS_STYLE } from '@/components/badge'
import TopicModal from '@/components/topic-modal'

export default function TopicsPage() {
  const router = useRouter()
  const [topics, setTopics] = useState<TopicDTO[] | null>(null)
  const [category, setCategory] = useState('全部')
  const [status, setStatus] = useState('全部')
  const [modal, setModal] = useState<
    { mode: 'create' } | { mode: 'edit'; topic: TopicDTO } | null
  >(null)
  const [writingId, setWritingId] = useState<number | null>(null)

  async function load() {
    const res = await fetch('/api/topics')
    setTopics(await res.json())
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(
    () =>
      (topics ?? []).filter(
        (t) =>
          (category === '全部' || t.category === category) &&
          (status === '全部' || t.status === status),
      ),
    [topics, category, status],
  )

  async function startWriting(topicId: number) {
    setWritingId(topicId)
    const res = await fetch('/api/contents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId }),
    })
    const content = await res.json()
    router.push(`/contents/${content.id}`)
  }

  async function remove(topic: TopicDTO) {
    if (!window.confirm(`删除选题「${topic.title}」？其文案也会一并删除。`)) return
    await fetch(`/api/topics/${topic.id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-zinc-900">选题库</h1>
        <span className="text-sm text-zinc-400">{filtered.length} 条</span>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="ml-auto rounded-lg bg-amber-500 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-amber-400"
        >
          + 新建选题
        </button>
      </div>

      {/* 筛选 */}
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs text-zinc-400">分类</span>
          {['全部', ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                category === c
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs text-zinc-400">状态</span>
          {['全部', ...TOPIC_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                status === s
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      {topics === null ? (
        <p className="py-10 text-center text-sm text-zinc-400">加载中…</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-400">
          没有符合筛选条件的选题
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={CATEGORY_STYLE[t.category] ?? ''}>
                  {t.category}
                </Badge>
                <Badge className={TOPIC_STATUS_STYLE[t.status] ?? ''}>
                  {t.status}
                </Badge>
                <span className="ml-auto text-xs text-zinc-400">
                  {formatDateCN(t.createdAt)}
                </span>
              </div>
              <h2 className="mt-2.5 font-medium leading-6 text-zinc-900">
                {t.title}
              </h2>
              {t.hook && (
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-500">
                  「{t.hook}」
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => startWriting(t.id)}
                  disabled={writingId === t.id}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
                >
                  {writingId === t.id ? '打开中…' : '写稿'}
                </button>
                <button
                  onClick={() => setModal({ mode: 'edit', topic: t })}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-500 hover:text-zinc-900"
                >
                  编辑
                </button>
                <button
                  onClick={() => remove(t)}
                  className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-red-500"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <TopicModal
          topic={modal.mode === 'edit' ? modal.topic : null}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            load()
          }}
        />
      )}
    </div>
  )
}
