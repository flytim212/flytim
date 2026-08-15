'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BENCHMARK_STATUSES } from '@/lib/constants'
import { BenchmarkDTO } from '@/lib/types'
import { Badge } from '@/components/badge'

const INPUT_CLS =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500'

const STATUS_STYLE: Record<string, string> = {
  待拆解: 'bg-amber-50 text-amber-700 border-amber-200',
  已拆解: 'bg-sky-50 text-sky-700 border-sky-200',
  已洗稿: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return String(n)
}

export default function BenchmarksPage() {
  const router = useRouter()
  const [list, setList] = useState<BenchmarkDTO[] | null>(null)
  const [status, setStatus] = useState('全部')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<BenchmarkDTO | null>(null)
  const [creating, setCreating] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [batch, setBatch] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/benchmarks')
    setList(await res.json())
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(
    () =>
      (list ?? []).filter(
        (b) =>
          (status === '全部' || b.status === status) &&
          (q.trim() === '' ||
            b.title.includes(q.trim()) ||
            b.author.includes(q.trim())),
      ),
    [list, status, q],
  )

  // 批量收集：一行一条，格式 标题|博主|点赞|链接
  async function addBatch() {
    const items = batch
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, author, likes, url] = line.split('|').map((p) => p.trim())
        return { title, author: author ?? '', likes: likes ?? 0, url: url ?? '' }
      })
      .filter((i) => i.title)
    if (items.length === 0) {
      setMsg('没有可导入的行')
      return
    }
    setSaving(true)
    const res = await fetch('/api/benchmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    setSaving(false)
    const d = await res.json()
    if (!res.ok) {
      setMsg(d.error || '导入失败')
      return
    }
    setBatch('')
    setMsg(`收集 ${d.created} 条爆款 ✓`)
    load()
  }

  // 对标转选题（带定位 + 关联），然后直接去写稿
  async function toTopic(b: BenchmarkDTO) {
    setMsg('')
    const res = await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: b.title,
        hook: b.opening.split('\n')[0] ?? '',
        category: '方法',
        linkedBenchmarkId: b.id,
        audience: b.audience,
        demand: b.demand,
        painPoint: b.painPoint,
        solution: b.solution,
      }),
    })
    if (!res.ok) {
      setMsg('转选题失败')
      return
    }
    const topic = await res.json()
    // 标记已洗稿由写稿完成后再改，这里先标已拆解
    await fetch(`/api/benchmarks/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: '已洗稿' }),
    })
    const cRes = await fetch('/api/contents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId: topic.id }),
    })
    const content = await cRes.json()
    router.push(`/contents/${content.id}`)
  }

  async function del(b: BenchmarkDTO) {
    if (!window.confirm(`删除对标「${b.title}」？`)) return
    await fetch(`/api/benchmarks/${b.id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-zinc-900">对标爆款库</h1>
        <span className="text-sm text-zinc-400">{filtered.length} 条</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setBatchOpen(true)}
            className="rounded-lg border border-zinc-300 px-3.5 py-1.5 text-sm text-zinc-600 hover:border-amber-400 hover:text-amber-700"
          >
            批量收集
          </button>
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-amber-500 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-amber-400"
          >
            + 收集爆款
          </button>
        </div>
      </div>

      <p className="text-xs leading-5 text-zinc-400">
        流程：刷到同赛道爆款 → 收集进来 → 拆开场白/观点/结尾三维度 → 转选题去洗稿（一查二改三创新）
      </p>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {['全部', ...BENCHMARK_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                status === s ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜标题 / 博主…"
          className="ml-auto w-48 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-amber-500"
        />
      </div>

      {msg && <p className="text-xs text-amber-600">{msg}</p>}

      {/* 列表 */}
      {list === null ? (
        <p className="py-10 text-center text-sm text-zinc-400">加载中…</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-400">
          还没收集爆款——刷到同赛道数据好的视频就存进来
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((b) => (
            <li
              key={b.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={STATUS_STYLE[b.status] ?? ''}>{b.status}</Badge>
                {b.author && (
                  <span className="text-xs text-zinc-500">
                    {b.author}
                    {b.fans && <span className="ml-1 text-zinc-400">{b.fans}粉</span>}
                  </span>
                )}
                <span className="ml-auto text-xs tabular-nums text-zinc-400">
                  赞 {fmt(b.likes)}
                  {b.views > 0 && <span className="ml-2">播 {fmt(b.views)}</span>}
                </span>
              </div>
              <h2 className="mt-2.5 line-clamp-2 font-medium leading-6 text-zinc-900">
                {b.title}
              </h2>
              {b.whyHit && (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                  为什么爆：{b.whyHit}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-zinc-400">
                <span className={b.opening ? 'text-emerald-600' : ''}>
                  {b.opening ? '✓' : '·'} 开场白
                </span>
                <span className={b.argument ? 'text-emerald-600' : ''}>
                  {b.argument ? '✓' : '·'} 观点论证
                </span>
                <span className={b.ending ? 'text-emerald-600' : ''}>
                  {b.ending ? '✓' : '·'} 结尾
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => toTopic(b)}
                  disabled={b.status === '已洗稿'}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-40"
                >
                  {b.status === '已洗稿' ? '已转选题' : '转选题去洗稿'}
                </button>
                <button
                  onClick={() => setEditing(b)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-500 hover:text-zinc-900"
                >
                  {b.opening || b.argument || b.ending ? '改拆解' : '拆解'}
                </button>
                {b.url && (
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-amber-600"
                  >
                    原视频
                  </a>
                )}
                <button
                  onClick={() => del(b)}
                  className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-red-500"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 新建/拆解弹窗 */}
      {(creating || editing) && (
        <BenchModal
          bench={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            load()
          }}
        />
      )}

      {/* 批量收集弹窗 */}
      {batchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 sm:items-center sm:p-4"
          onClick={() => setBatchOpen(false)}
        >
          <div
            className="max-h-[92dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-medium text-zinc-900">批量收集爆款</h2>
            <p className="text-xs leading-5 text-zinc-400">
              一行一条，用竖线分隔：<code className="rounded bg-zinc-100 px-1">标题|博主|点赞|链接</code>
              （后三项可省略，点赞可写 1.2万）
            </p>
            <textarea
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              rows={6}
              placeholder={'明确核心人群四步建立素材库|Leong|765|https://v.douyin.com/xxx\n被裁那天我在楼下坐了四小时|某博主|1.2万'}
              className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBatchOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-900"
              >
                取消
              </button>
              <button
                onClick={addBatch}
                disabled={saving || !batch.trim()}
                className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
              >
                {saving ? '导入中…' : '导入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 收集 / 拆解弹窗：收集阶段只填基本项，拆解阶段填三维度+定位
function BenchModal({
  bench,
  onClose,
  onSaved,
}: {
  bench: BenchmarkDTO | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    title: bench?.title ?? '',
    author: bench?.author ?? '',
    fans: bench?.fans ?? '',
    url: bench?.url ?? '',
    publishedAt: bench?.publishedAt ?? '',
    views: bench ? String(bench.views || '') : '',
    likes: bench ? String(bench.likes || '') : '',
    comments: bench ? String(bench.comments || '') : '',
    saves: bench ? String(bench.saves || '') : '',
    shares: bench ? String(bench.shares || '') : '',
    opening: bench?.opening ?? '',
    argument: bench?.argument ?? '',
    ending: bench?.ending ?? '',
    whyHit: bench?.whyHit ?? '',
    audience: bench?.audience ?? '',
    demand: bench?.demand ?? '',
    painPoint: bench?.painPoint ?? '',
    solution: bench?.solution ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit() {
    if (!form.title.trim()) {
      setError('标题不能为空')
      return
    }
    setSaving(true)
    const res = await fetch(bench ? `/api/benchmarks/${bench.id}` : '/api/benchmarks', {
      method: bench ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) {
      setError('保存失败，请重试')
      return
    }
    onSaved()
  }

  const digDone = [form.opening, form.argument, form.ending].filter((v) => v.trim()).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-medium text-zinc-900">
          {bench ? '拆解对标' : '收集爆款'}
        </h2>

        {/* 基本信息 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs text-zinc-400">爆款标题 *</span>
            <input
              value={form.title}
              onChange={(e) => {
                setForm({ ...form, title: e.target.value })
                setError('')
              }}
              placeholder="抄原标题，含它的钩子"
              className={INPUT_CLS}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">博主</span>
            <input
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              placeholder="博主名"
              className={INPUT_CLS}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">粉丝量</span>
            <input
              value={form.fans}
              onChange={(e) => setForm({ ...form, fans: e.target.value })}
              placeholder="如 41.7万"
              className={INPUT_CLS}
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs text-zinc-400">链接</span>
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://v.douyin.com/…"
              className={INPUT_CLS}
            />
          </label>
        </div>

        {/* 数据（可后补） */}
        <details className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
          <summary className="cursor-pointer text-xs text-zinc-500">
            爆款数据（选填，点赞数决定列表排序）
          </summary>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {(
              [
                ['views', '播放'],
                ['likes', '点赞'],
                ['comments', '评论'],
                ['saves', '收藏'],
                ['shares', '转发'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="space-y-1">
                <span className="text-xs text-zinc-400">{label}</span>
                <input
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-amber-500"
                />
              </label>
            ))}
          </div>
        </details>

        {/* 拆解三维度（洗稿对象） */}
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600">
              拆解三维度（洗稿只洗这三处）
            </span>
            <span className={`text-xs ${digDone === 3 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {digDone}/3
            </span>
          </div>
          {(
            [
              ['opening', '开场白原文（前3秒说了什么）', '把它的第一句话抄下来'],
              ['argument', '核心观点 + 论证', '它主张什么，用什么证明'],
              ['ending', '结尾', '怎么收的，引导了什么互动'],
            ] as const
          ).map(([k, label, ph]) => (
            <label key={k} className="block space-y-1">
              <span className="text-xs text-zinc-400">{label}</span>
              <textarea
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                rows={k === 'argument' ? 3 : 2}
                placeholder={ph}
                className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </label>
          ))}
        </div>

        {/* 我的分析 + 对方定位 */}
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">我的分析：为什么爆</span>
          <input
            value={form.whyHit}
            onChange={(e) => setForm({ ...form, whyHit: e.target.value })}
            placeholder="如：开头直接戳「想日更但写不出」的痛点"
            className={INPUT_CLS}
          />
        </label>

        <details className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
          <summary className="cursor-pointer text-xs text-zinc-500">
            对方定位四要素（转选题时自动带入）
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(
              [
                ['audience', '核心人群'],
                ['demand', '需求问题'],
                ['painPoint', '痛点'],
                ['solution', '解决方案'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="space-y-1">
                <span className="text-xs text-zinc-400">{label}</span>
                <input
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-amber-500"
                />
              </label>
            ))}
          </div>
        </details>

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
