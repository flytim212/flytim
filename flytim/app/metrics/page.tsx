'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CATEGORIES, PLATFORMS } from '@/lib/constants'
import { MetricDTO } from '@/lib/types'
import { formatDateCN, localDateKey } from '@/lib/format'
import { parseMetricsText } from '@/lib/metric-paste'
import { CategoryBars, TrendChart } from '@/components/metrics-charts'

type ContentOption = { id: number; label: string }

const NUM_FIELDS = [
  { key: 'views', label: '播放量' },
  { key: 'completion3s', label: '3秒完播 %' },
  { key: 'completionFull', label: '总完播 %' },
  { key: 'likes', label: '点赞' },
  { key: 'comments', label: '评论' },
  { key: 'saves', label: '收藏' },
  { key: 'shares', label: '转发' },
  { key: 'newFans', label: '涨粉' },
] as const

const INPUT_CLS =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500'

export default function MetricsPage() {
  const [records, setRecords] = useState<MetricDTO[] | null>(null)
  const [contents, setContents] = useState<ContentOption[]>([])
  const [category, setCategory] = useState('全部')

  // 录入表单
  const [contentId, setContentId] = useState('')
  const [platform, setPlatform] = useState<string>('抖音')
  const [date, setDate] = useState('')
  const [nums, setNums] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedTick, setSavedTick] = useState(0)

  // 粘贴解析
  const [paste, setPaste] = useState('')
  const [pasteMsg, setPasteMsg] = useState('')

  useEffect(() => {
    setDate(localDateKey(new Date()))
    load()
  }, [])

  async function load() {
    const [rs, cs] = await Promise.all([
      fetch('/api/metrics').then((r) => r.json()),
      fetch('/api/contents').then((r) => r.json()),
    ])
    setRecords(rs)
    setContents(
      (cs as { id: number; publishedDate: string | null; topic: { title: string; category: string } }[])
        .filter((c) => c.publishedDate)
        .map((c) => ({ id: c.id, label: `${c.topic.title}（${c.topic.category}）` })),
    )
  }

  const filtered = useMemo(
    () =>
      (records ?? []).filter(
        (r) => category === '全部' || r.content.topic.category === category,
      ),
    [records, category],
  )

  // 近 30 天按日聚合（点赞/评论/收藏求和），裁掉前面全为空的日期
  const trend = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - (29 - i))
      return d
    })
    const rows = days.map((d) => {
      const k = localDateKey(d)
      const hit = filtered.filter((r) => r.date.slice(0, 10) === k)
      return {
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        likes: hit.reduce((s, r) => s + r.likes, 0),
        comments: hit.reduce((s, r) => s + r.comments, 0),
        saves: hit.reduce((s, r) => s + r.saves, 0),
        any: hit.length > 0,
      }
    })
    const first = rows.findIndex((r) => r.any)
    return first > 0 ? rows.slice(first) : rows
  }, [filtered])

  // 分类聚合：平均点赞、平均总完播率
  const catStats = useMemo(() => {
    const map = new Map<string, { likes: number; completion: number[]; count: number }>()
    for (const r of filtered) {
      const c = r.content.topic.category
      const e = map.get(c) ?? { likes: 0, completion: [], count: 0 }
      e.likes += r.likes
      e.count += 1
      if (r.completionFull != null) e.completion.push(r.completionFull)
      map.set(c, e)
    }
    return CATEGORIES.filter((c) => map.has(c)).map((c) => {
      const e = map.get(c)!
      return {
        category: c,
        count: e.count,
        avgLikes: Math.round(e.likes / e.count),
        avgCompletion: e.completion.length
          ? Math.round((e.completion.reduce((a, b) => a + b, 0) / e.completion.length) * 10) / 10
          : 0,
      }
    })
  }, [filtered])

  const noteCount = useMemo(
    () => (records ?? []).filter((r) => r.iterationNote).length,
    [records],
  )

  // 粘贴后台数据 → 自动填表
  function doParse() {
    const { values, matched } = parseMetricsText(paste)
    if (matched.length === 0) {
      setPasteMsg('没识别到数据，试试「播放量 1234 点赞 56」这种格式')
      return
    }
    setNums((prev) => {
      const next = { ...prev }
      for (const [k, v] of Object.entries(values)) {
        if (v != null) next[k] = String(v)
      }
      return next
    })
    setPasteMsg(`已填入 ${matched.length} 项：${matched.join('、')}`)
  }

  async function submit() {
    setError('')
    if (!contentId) {
      setError('请选择内容')
      return
    }
    setSaving(true)
    const res = await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentId: Number(contentId),
        platform,
        date,
        views: nums.views ?? 0,
        completion3s: nums.completion3s ?? '',
        completionFull: nums.completionFull ?? '',
        likes: nums.likes ?? 0,
        comments: nums.comments ?? 0,
        saves: nums.saves ?? 0,
        shares: nums.shares ?? 0,
        newFans: nums.newFans ?? 0,
        iterationNote: note,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      setError(e.error || '保存失败，请重试')
      return
    }
    setNums({})
    setNote('')
    setSavedTick((t) => t + 1)
    load()
  }

  async function del(m: MetricDTO) {
    if (
      !window.confirm(
        `删除「${m.content.topic.title}」${m.platform} ${formatDateCN(m.date)} 的这条数据？`,
      )
    )
      return
    await fetch(`/api/metrics/${m.id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-zinc-900">数据中心</h1>
        <span className="text-sm text-zinc-400">{filtered.length} 条记录</span>
        <Link
          href="/metrics/notes"
          className="ml-auto text-sm text-amber-600 hover:underline"
        >
          迭代日志（{noteCount}）→
        </Link>
      </div>

      {/* 粘贴解析 */}
      <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-zinc-700">
            不想逐项填？粘贴后台数据，自动填表
          </summary>
          <p className="mt-2 text-xs text-zinc-400">
            从抖音 / 小红书创作者后台把数据复制成一串文字粘贴进来（支持 万 / 逗号 / % 单位）
          </p>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={3}
            placeholder={'例：播放量 1.2万  点赞 356  评论 23  收藏 45  转发 12  涨粉 8\n3秒完播率 25.3%  完播率 11.2%'}
            className="mt-2 w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={doParse}
              disabled={!paste.trim()}
              className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
            >
              解析并填入下方表单
            </button>
            {pasteMsg && (
              <span className="text-xs text-zinc-600">{pasteMsg}</span>
            )}
          </div>
        </details>
      </section>

      {/* 录入 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-700">录数据</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">内容（已发布）</span>
            <select
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              className={INPUT_CLS}
            >
              <option value="">选择内容…</option>
              {contents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">平台</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className={INPUT_CLS}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">日期</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={INPUT_CLS}
            />
          </label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {NUM_FIELDS.map((f) => (
            <label key={f.key} className="space-y-1">
              <span className="text-xs text-zinc-400">{f.label}</span>
              <input
                type="number"
                min={0}
                step={f.key.startsWith('completion') ? 0.1 : 1}
                value={nums[f.key] ?? ''}
                onChange={(e) =>
                  setNums({ ...nums, [f.key]: e.target.value })
                }
                className={INPUT_CLS}
              />
            </label>
          ))}
        </div>
        <div className="mt-3 space-y-1">
          <span className="text-xs text-zinc-400">
            迭代备注：这条为什么好 / 差（会进迭代日志）
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="例：爆了——开头直接给结果，3秒完播明显拉高"
            className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存'}
          </button>
          {savedTick > 0 && !error && (
            <span className="text-xs text-emerald-600">已保存 ✓</span>
          )}
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </section>

      {/* 趋势 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium text-zinc-700">
            近 30 天走势（按日合计）
          </h2>
          <div className="ml-auto flex flex-wrap items-center gap-1 text-sm">
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
        </div>
        <div className="mt-4">
          {records === null ? (
            <p className="py-10 text-center text-sm text-zinc-400">加载中…</p>
          ) : trend.length === 0 || !trend.some((r) => r.any) ? (
            <p className="py-10 text-center text-sm text-zinc-400">
              该分类下还没有数据，先在上面录一条
            </p>
          ) : (
            <TrendChart data={trend} />
          )}
        </div>
      </section>

      {/* 分类分析 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-700">
          分类分析：哪类内容在被验证
        </h2>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
          {catStats.length === 0 ? (
            <p className="py-6 text-sm text-zinc-400">暂无数据</p>
          ) : (
            catStats.map((s) => (
              <span key={s.category}>
                {s.category} · {s.count} 条记录
              </span>
            ))
          )}
        </div>
        {catStats.length > 0 && (
          <div className="mt-2">
            <CategoryBars data={catStats} />
          </div>
        )}
      </section>

      {/* 记录表 */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-zinc-700">数据记录</h2>
        {records === null ? (
          <p className="py-6 text-center text-sm text-zinc-400">加载中…</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">
            暂无数据，先在上方录入
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-400">
                  <th className="px-3 py-2 font-normal">内容</th>
                  <th className="px-3 py-2 font-normal">平台</th>
                  <th className="px-3 py-2 font-normal">日期</th>
                  <th className="px-3 py-2 font-normal">播放</th>
                  <th className="px-3 py-2 font-normal">3s完播</th>
                  <th className="px-3 py-2 font-normal">总完播</th>
                  <th className="px-3 py-2 font-normal">赞</th>
                  <th className="px-3 py-2 font-normal">评</th>
                  <th className="px-3 py-2 font-normal">藏</th>
                  <th className="px-3 py-2 font-normal">转</th>
                  <th className="px-3 py-2 font-normal">涨粉</th>
                  <th className="px-3 py-2 font-normal">备注</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-100 last:border-0">
                    <td
                      className="max-w-[200px] truncate px-3 py-2 text-zinc-900"
                      title={m.content.topic.title}
                    >
                      {m.content.topic.title}
                    </td>
                    <td className="px-3 py-2">{m.platform}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                      {formatDateCN(m.date)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{m.views}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-500">
                      {m.completion3s != null ? `${m.completion3s}%` : '—'}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-zinc-500">
                      {m.completionFull != null ? `${m.completionFull}%` : '—'}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{m.likes}</td>
                    <td className="px-3 py-2 tabular-nums">{m.comments}</td>
                    <td className="px-3 py-2 tabular-nums">{m.saves}</td>
                    <td className="px-3 py-2 tabular-nums">{m.shares}</td>
                    <td className="px-3 py-2 tabular-nums">{m.newFans}</td>
                    <td
                      className="max-w-[160px] truncate px-3 py-2 text-zinc-500"
                      title={m.iterationNote}
                    >
                      {m.iterationNote || '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => del(m)}
                        className="text-xs text-zinc-400 hover:text-red-500"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
