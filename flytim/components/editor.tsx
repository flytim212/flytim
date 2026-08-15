'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BUILTIN_BANNED_WORDS,
  CHARS_PER_SECOND,
  CONTENT_STATUSES,
  DURATION_WARN_SECONDS,
  PERSONA_REDLINES,
  STRUCTURE_TEMPLATE,
} from '@/lib/constants'
import { ContentDTO, TopicDTO } from '@/lib/types'
import { toDateInputValue } from '@/lib/format'
import { Badge, CATEGORY_STYLE, TOPIC_STATUS_STYLE } from '@/components/badge'

type FullContent = ContentDTO & { topic: TopicDTO }

const INPUT_CLS =
  'rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-amber-500'

export default function Editor({ id }: { id: number }) {
  const [data, setData] = useState<FullContent | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('写稿中')
  const [planned, setPlanned] = useState('')
  const [published, setPublished] = useState('')
  const [customWords, setCustomWords] = useState<string[]>([])
  const [newWord, setNewWord] = useState('')
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved')
  const [savedAt, setSavedAt] = useState('')
  // 写稿计时器（目标 5 分钟一条）
  const [seconds, setSeconds] = useState(0)
  const [timing, setTiming] = useState(false)
  const loadedRef = useRef(false)
  const lastSavedRef = useRef('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)

  // 加载文案 + 自定义禁词
  useEffect(() => {
    let alive = true
    Promise.all([
      fetch(`/api/contents/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/settings').then((r) => r.json()),
    ]).then(([content, settings]) => {
      if (!alive) return
      if (!content) {
        setNotFound(true)
        return
      }
      const initial = {
        body: content.body ?? '',
        status: content.status ?? '写稿中',
        planned: toDateInputValue(content.plannedDate),
        published: toDateInputValue(content.publishedDate),
      }
      setData(content)
      setBody(initial.body)
      setStatus(initial.status)
      setPlanned(initial.planned)
      setPublished(initial.published)
      setCustomWords(settings.customBannedWords ?? [])
      lastSavedRef.current = JSON.stringify(initial)
      loadedRef.current = true
    })
    return () => {
      alive = false
    }
  }, [id])

  const save = useCallback(async () => {
    setSaveState('saving')
    try {
      const res = await fetch(`/api/contents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          status,
          plannedDate: planned || null,
          publishedDate: published || null,
        }),
      })
      if (!res.ok) throw new Error('save failed')
      const updated = await res.json()
      lastSavedRef.current = JSON.stringify({ body, status, planned, published })
      setSaveState('saved')
      setSavedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
      if (updated.topic && data) {
        setData({
          ...data,
          topic: { ...data.topic, status: updated.topic.status },
        })
      }
    } catch {
      setSaveState('error')
    }
  }, [id, body, status, planned, published, data])

  // 自动保存：停止编辑 1 秒后触发
  const snapshot = JSON.stringify({ body, status, planned, published })
  useEffect(() => {
    if (!loadedRef.current || snapshot === lastSavedRef.current) return
    setSaveState('dirty')
    const timer = setTimeout(save, 1000)
    return () => clearTimeout(timer)
  }, [snapshot, save])

  // 计时器
  useEffect(() => {
    if (!timing) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [timing])
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const overTime = seconds > 300

  // 禁词：内置 + 自定义，去重
  const allWords = useMemo(
    () => Array.from(new Set([...BUILTIN_BANNED_WORDS, ...customWords])),
    [customWords],
  )

  // 切分正文为普通片段 / 命中片段，并统计命中次数
  const { parts, found } = useMemo(() => {
    if (!body || allWords.length === 0) {
      return { parts: [{ text: body, hit: false }], found: [] as { word: string; count: number }[] }
    }
    const escaped = allWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const re = new RegExp(`(${escaped.join('|')})`, 'g')
    const segs: { text: string; hit: boolean }[] = []
    const counts = new Map<string, number>()
    let last = 0
    for (const m of body.matchAll(re)) {
      const idx = m.index ?? 0
      if (idx > last) segs.push({ text: body.slice(last, idx), hit: false })
      segs.push({ text: m[0], hit: true })
      counts.set(m[0], (counts.get(m[0]) ?? 0) + 1)
      last = idx + m[0].length
    }
    if (last < body.length) segs.push({ text: body.slice(last), hit: false })
    return {
      parts: segs,
      found: Array.from(counts, ([word, count]) => ({ word, count })).sort(
        (a, b) => b.count - a.count,
      ),
    }
  }, [body, allWords])

  const wordCount = useMemo(() => body.replace(/\s+/g, '').length, [body])
  const duration = Math.round(wordCount / CHARS_PER_SECOND)
  const overLimit = duration > DURATION_WARN_SECONDS
  const bannedTotal = found.reduce((s, f) => s + f.count, 0)

  async function persistWords(next: string[]) {
    setCustomWords(next)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customBannedWords: next }),
    })
  }

  function addWord() {
    const w = newWord.trim()
    setNewWord('')
    if (!w || allWords.includes(w)) return
    persistWords([...customWords, w])
  }

  // 在光标处插入结构骨架
  function insertTemplate() {
    const ta = textareaRef.current
    const start = ta?.selectionStart ?? body.length
    const end = ta?.selectionEnd ?? start
    const prefix = body.slice(0, start)
    const suffix = body.slice(end)
    const pad = prefix && !prefix.endsWith('\n') ? '\n\n' : ''
    const insert = pad + STRUCTURE_TEMPLATE
    setBody(prefix + insert + suffix)
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      const pos = prefix.length + insert.length
      el.setSelectionRange(pos, pos)
    })
  }

  // 高亮层与输入层滚动同步
  function syncScroll() {
    const ta = textareaRef.current
    const ov = overlayRef.current
    if (!ta || !ov) return
    ov.scrollTop = ta.scrollTop
    ov.scrollLeft = ta.scrollLeft
  }

  if (notFound) {
    return (
      <div className="py-16 text-center">
        <p className="text-zinc-500">文案不存在或已被删除</p>
        <Link
          href="/topics"
          className="mt-3 inline-block text-sm text-amber-600 hover:underline"
        >
          返回选题库
        </Link>
      </div>
    )
  }

  if (!data) {
    return <p className="py-16 text-center text-sm text-zinc-400">加载中…</p>
  }

  const saveLabel =
    saveState === 'saving'
      ? '保存中…'
      : saveState === 'dirty'
        ? '未保存'
        : saveState === 'error'
          ? '保存失败，点此重试'
          : savedAt
            ? `已保存 ${savedAt}`
            : '已保存'

  return (
    <div className="flex flex-col gap-4">
      {/* 头部：选题信息 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href="/topics"
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← 选题库
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold leading-7 text-zinc-900">
            {data.topic.title}
          </h1>
          {data.topic.hook && (
            <p className="truncate text-xs text-zinc-400">
              「{data.topic.hook}」
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={CATEGORY_STYLE[data.topic.category] ?? ''}>
            {data.topic.category}
          </Badge>
          <Badge className={TOPIC_STATUS_STYLE[data.topic.status] ?? ''}>
            {data.topic.status}
          </Badge>
        </div>
      </div>

      {/* 控制行：状态 / 计划日 / 发布日 / 保存状态 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-2 text-zinc-500">
          状态
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={INPUT_CLS}
          >
            {CONTENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-zinc-500">
          计划发布
          <input
            type="date"
            value={planned}
            onChange={(e) => setPlanned(e.target.value)}
            className={INPUT_CLS}
          />
        </label>
        <label className="flex items-center gap-2 text-zinc-500">
          实际发布
          <input
            type="date"
            value={published}
            onChange={(e) => setPublished(e.target.value)}
            className={INPUT_CLS}
          />
        </label>
        <button
          onClick={save}
          className={`ml-auto text-xs ${
            saveState === 'error'
              ? 'text-red-500 hover:underline'
              : saveState === 'saved'
                ? 'text-zinc-400'
                : 'text-amber-600'
          }`}
        >
          {saveLabel}
        </button>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* 左：编辑区（输入层 + 高亮层叠加） */}
        <section className="min-w-0 flex-1">
          <div className="relative h-[55vh] overflow-hidden rounded-xl border border-zinc-200 bg-white lg:h-[calc(100dvh-270px)] lg:min-h-[420px]">
            <div
              ref={overlayRef}
              aria-hidden
              className="absolute inset-0 z-0 overflow-hidden whitespace-pre-wrap break-words p-4 text-[15px] leading-7 text-transparent"
            >
              {parts.map((p, i) =>
                p.hit ? (
                  <mark key={i} className="hw-mark">
                    {p.text}
                  </mark>
                ) : (
                  <span key={i}>{p.text}</span>
                ),
              )}
              {'\n\n'}
            </div>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onScroll={syncScroll}
              spellCheck={false}
              placeholder="从这里开始写正文…"
              className="absolute inset-0 z-10 h-full w-full resize-none bg-transparent p-4 text-[15px] leading-7 text-zinc-900 caret-amber-600 outline-none placeholder:text-zinc-400"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-zinc-500">
            <span>{wordCount} 字</span>
            <span className={overLimit ? 'text-red-500' : ''}>
              约 {duration} 秒
            </span>
            <span className={bannedTotal > 0 ? 'text-red-500' : ''}>
              禁词 {bannedTotal} 处
            </span>
          </div>
        </section>

        {/* 右：辅助栏 */}
        <aside className="w-full shrink-0 space-y-4 lg:w-80">
          {/* 〇：本条定位 */}
          {(data.topic.audience ||
            data.topic.demand ||
            data.topic.painPoint ||
            data.topic.solution) && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="text-sm font-medium text-zinc-700">本条定位</h2>
              <dl className="mt-3 space-y-2">
                {(
                  [
                    ['核心人群', data.topic.audience],
                    ['需求问题', data.topic.demand],
                    ['痛点', data.topic.painPoint],
                    ['解决方案', data.topic.solution],
                  ] as const
                )
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-xs leading-5">
                      <dt className="w-14 shrink-0 text-zinc-400">{k}</dt>
                      <dd className="min-w-0 text-zinc-700">{v}</dd>
                    </div>
                  ))}
              </dl>
            </section>
          )}

          {/* 〇：写稿计时 */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-700">写稿计时</h2>
              <span className="text-xs text-zinc-400">目标 5 分钟 / 条</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span
                className={`text-3xl font-semibold tabular-nums ${
                  overTime ? 'text-red-500' : seconds > 0 ? 'text-zinc-900' : 'text-zinc-300'
                }`}
              >
                {mmss}
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setTiming((t) => !t)}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-400"
                >
                  {timing ? '暂停' : '开始'}
                </button>
                <button
                  onClick={() => {
                    setTiming(false)
                    setSeconds(0)
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:border-zinc-500 hover:text-zinc-900"
                >
                  重置
                </button>
              </div>
            </div>
            <p
              className={`mt-2 text-xs ${overTime ? 'text-red-500' : 'text-zinc-400'}`}
            >
              {overTime
                ? '超时了——先写完再改，别在半路抠字'
                : '选题限时 2 分钟、写稿限时 5 分钟，逼自己快'}
            </p>
          </section>

          {/* 一：结构模板 */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-medium text-zinc-700">结构模板</h2>
            <button
              onClick={insertTemplate}
              className="mt-3 w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-400"
            >
              在光标处插入骨架
            </button>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              钩子（前3秒）→ 事件 → 内心实况 → 方法 → 结尾互动提问
            </p>
          </section>

          {/* 二：禁词检查 */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-medium text-zinc-700">禁词检查</h2>
            <div className="mt-3">
              {found.length === 0 ? (
                <p className="text-xs text-emerald-600">✓ 未发现禁词</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {found.map((f) => (
                    <span
                      key={f.word}
                      className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600"
                    >
                      {f.word} × {f.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 border-t border-zinc-100 pt-3">
              <p className="text-xs text-zinc-400">
                自定义禁词（内置 {BUILTIN_BANNED_WORDS.length} 词不可删）
              </p>
              {customWords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {customWords.map((w) => (
                    <button
                      key={w}
                      onClick={() =>
                        persistWords(customWords.filter((x) => x !== w))
                      }
                      title="点击删除"
                      className="group rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:border-red-300 hover:text-red-600"
                    >
                      {w}{' '}
                      <span className="text-zinc-400 group-hover:text-red-500">
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <input
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addWord()
                  }}
                  placeholder="添加禁词…"
                  className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-amber-500"
                />
                <button
                  onClick={addWord}
                  className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm text-zinc-600 hover:border-zinc-500 hover:text-zinc-900"
                >
                  添加
                </button>
              </div>
            </div>
          </section>

          {/* 三：字数 · 时长 */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-medium text-zinc-700">字数 · 时长</h2>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={`text-3xl font-semibold tabular-nums ${
                  overLimit ? 'text-red-500' : 'text-zinc-900'
                }`}
              >
                {duration}
              </span>
              <span className="text-sm text-zinc-400">
                秒（{wordCount} 字 ÷ 4.5 字/秒）
              </span>
            </div>
            <p
              className={`mt-2 text-xs ${
                overLimit ? 'text-red-500' : 'text-zinc-400'
              }`}
            >
              {overLimit
                ? `超过 ${DURATION_WARN_SECONDS} 秒，建议拆分或精简`
                : `建议控制在 ${DURATION_WARN_SECONDS} 秒内`}
            </p>
          </section>

          {/* 四：人设红线 */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-medium text-zinc-700">人设红线</h2>
            <ul className="mt-3 space-y-2">
              {PERSONA_REDLINES.map((r) => (
                <li
                  key={r}
                  className="flex gap-2 text-xs leading-5 text-zinc-500"
                >
                  <span className="text-red-500">·</span>
                  {r}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
