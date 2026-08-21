'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/badge'

type ShotDTO = {
  id: number
  order: number
  startSec: number
  endSec: number
  narration: string
  sceneDesc: string
  imagePrompt: string
  imageUrl: string
  imageStatus: string
  imageError: string
}

type StoryboardDTO = {
  id: number
  title: string
  viewpoint: string
  overall: string
  duration: number
  status: string
  error: string
  shots: ShotDTO[]
}

type ListItem = {
  id: number
  title: string
  status: string
  duration: number
  shotCount: number
  imageDone: number
  createdAt: string
}

const INPUT_CLS =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500'

const STATUS_STYLE: Record<string, string> = {
  脚本生成中: 'bg-amber-50 text-amber-700 border-amber-200',
  脚本就绪: 'bg-sky-50 text-sky-700 border-sky-200',
  图片生成中: 'bg-violet-50 text-violet-700 border-violet-200',
  完成: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  失败: 'bg-red-50 text-red-600 border-red-200',
}

function fmtSec(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function StoryboardsPage() {
  const [list, setList] = useState<ListItem[] | null>(null)
  const [detail, setDetail] = useState<StoryboardDTO | null>(null)
  const [title, setTitle] = useState('')
  const [viewpoint, setViewpoint] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(false)
  const [imgBusyShot, setImgBusyShot] = useState<number | null>(null)
  const [imgBusyAll, setImgBusyAll] = useState(false)

  const loadList = useCallback(async () => {
    const res = await fetch('/api/storyboards')
    setList(await res.json())
  }, [])

  const loadDetail = useCallback(async (id: number) => {
    const res = await fetch(`/api/storyboards/${id}`)
    setDetail(res.ok ? await res.json() : null)
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  // 生成脚本：题目+核心观点 → AI
  async function generate() {
    if (!title.trim() || !viewpoint.trim()) {
      setMsgOk(false)
      setMsg('题目和核心观点都要填')
      return
    }
    setBusy(true)
    setMsg('脚本生成中，约需 10~30 秒…')
    const res = await fetch('/api/ai/storyboard-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), viewpoint: viewpoint.trim() }),
    })
    setBusy(false)
    const d = await res.json()
    if (!res.ok) {
      setMsgOk(false)
      setMsg(d.error || '生成失败')
      return
    }
    setDetail(d)
    setTitle('')
    setViewpoint('')
    setMsgOk(true)
    setMsg(`脚本已生成：${d.shots.length} 个分镜，总时长 ${d.duration} 秒 ✓`)
    loadList()
  }

  // 单个分镜生成图片
  async function genShotImage(sbId: number, shot: ShotDTO) {
    setImgBusyShot(shot.id)
    const res = await fetch(`/api/storyboards/${sbId}/shots/${shot.id}/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setImgBusyShot(null)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setMsgOk(false)
      setMsg(`分镜${shot.order} 图片生成失败：${d.error || '未知错误'}`)
    }
    loadDetail(sbId)
    loadList()
  }

  // 批量生成全部
  async function genAllImages(sbId: number) {
    setImgBusyAll(true)
    setMsg('批量生成分镜图片中，一镜约 5~20 秒…')
    const res = await fetch(`/api/storyboards/${sbId}/images`, { method: 'POST' })
    const d = await res.json()
    setImgBusyAll(false)
    setMsgOk(res.ok && d.failed === 0)
    setMsg(
      res.ok
        ? `图片生成完成：成功 ${d.generated} 张${d.failed ? `，失败 ${d.failed} 张` : ''}`
        : d.error || '生成失败',
    )
    loadDetail(sbId)
    loadList()
  }

  async function del(id: number) {
    if (!window.confirm('删除这个分镜脚本（含全部图片记录）？')) return
    await fetch(`/api/storyboards/${id}`, { method: 'DELETE' })
    if (detail?.id === id) setDetail(null)
    loadList()
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">分镜工作台</h1>
        <p className="mt-1 text-sm text-zinc-500">
          输入题目 + 核心观点 → AI 生成脚本、分镜与 seedance 提示词 → 生成分镜图片 → 按时间轴输出
        </p>
      </div>

      {/* 生成表单 */}
      <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">选题题目 *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：被裁员那天，我在楼下坐了四个小时"
              className={INPUT_CLS}
              disabled={busy}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">核心观点 *</span>
            <input
              value={viewpoint}
              onChange={(e) => setViewpoint(e.target.value)}
              placeholder="如：成年人崩溃不喊停，只是换个地方扛"
              className={INPUT_CLS}
              disabled={busy}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={generate}
            disabled={busy}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
          >
            {busy ? '生成中…' : '生成脚本 + 分镜 + seedance 提示词'}
          </button>
          {msg && (
            <span className={`text-xs ${msgOk ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</span>
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        {/* 左：历史列表 */}
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-zinc-700">历史脚本（{list?.length ?? 0}）</h2>
          {list === null ? (
            <p className="text-sm text-zinc-400">加载中…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-zinc-400">还没有生成过，先在上方填写题目</p>
          ) : (
            <ul className="space-y-2">
              {list.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => loadDetail(s.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      detail?.id === s.id
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-zinc-200 bg-white hover:border-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_STYLE[s.status] ?? ''}>{s.status}</Badge>
                      {s.duration > 0 && (
                        <span className="text-xs tabular-nums text-zinc-400">{s.duration}s</span>
                      )}
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-zinc-800">{s.title}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {s.shotCount} 镜 · 图 {s.imageDone}/{s.shotCount}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 右：详情时间轴 */}
        <section className="min-w-0">
          {!detail ? (
            <p className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-400">
              生成或从左侧选择一个脚本后，这里按时间轴展示每镜的图片、口播与思路
            </p>
          ) : (
            <div className="space-y-4">
              {/* 头部 */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={STATUS_STYLE[detail.status] ?? ''}>{detail.status}</Badge>
                  {detail.duration > 0 && (
                    <span className="text-xs tabular-nums text-zinc-400">
                      总时长 {fmtSec(detail.duration)}
                    </span>
                  )}
                  <span className="text-xs text-zinc-400">{detail.shots.length} 个分镜</span>
                  <button
                    onClick={() => genAllImages(detail.id)}
                    disabled={imgBusyAll || detail.shots.every((s) => s.imageStatus === '已生成')}
                    className="ml-auto rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-400 disabled:opacity-40"
                  >
                    {imgBusyAll ? '生成中…' : '生成全部分镜图片'}
                  </button>
                  <button
                    onClick={() => del(detail.id)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-500 hover:border-red-300 hover:text-red-500"
                  >
                    删除
                  </button>
                </div>
                <h2 className="mt-3 font-medium leading-6 text-zinc-900">{detail.title}</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  <span className="text-zinc-400">核心观点：</span>
                  {detail.viewpoint}
                </p>
                {detail.overall && (
                  <div className="mt-3 rounded-lg bg-zinc-50 p-3">
                    <p className="text-xs font-medium text-zinc-500">整体思路</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-700">{detail.overall}</p>
                  </div>
                )}
                {detail.error && (
                  <p className="mt-2 text-xs leading-5 text-red-500">上次错误：{detail.error}</p>
                )}
              </div>

              {/* 分镜时间轴 */}
              <ol className="space-y-3">
                {detail.shots.map((shot) => (
                  <li
                    key={shot.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4 sm:flex sm:gap-4"
                  >
                    {/* 图片区 */}
                    <div className="mx-auto w-36 shrink-0 sm:mx-0">
                      {shot.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={shot.imageUrl}
                          alt={`分镜${shot.order}`}
                          className="w-36 rounded-lg border border-zinc-200 object-cover"
                        />
                      ) : (
                        <button
                          onClick={() => genShotImage(detail.id, shot)}
                          disabled={imgBusyShot === shot.id || imgBusyAll}
                          className="flex h-64 w-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-400 hover:border-amber-400 hover:text-amber-600 disabled:opacity-50"
                        >
                          {imgBusyShot === shot.id ? (
                            '生成中…'
                          ) : (
                            <>
                              <span className="text-2xl">+</span>
                              <span>生成本镜图片</span>
                            </>
                          )}
                        </button>
                      )}
                      {shot.imageStatus === '失败' && (
                        <p className="mt-1 text-xs leading-4 text-red-500">{shot.imageError}</p>
                      )}
                    </div>

                    {/* 文案区 */}
                    <div className="mt-3 min-w-0 flex-1 sm:mt-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-xs font-medium tabular-nums text-white">
                          {fmtSec(shot.startSec)} - {fmtSec(shot.endSec)}
                        </span>
                        <span className="text-xs text-zinc-400">
                          第 {shot.order} 镜 · {shot.endSec - shot.startSec}s
                        </span>
                        <span
                          className={`text-xs ${
                            shot.imageStatus === '已生成'
                              ? 'text-emerald-600'
                              : shot.imageStatus === '失败'
                                ? 'text-red-500'
                                : 'text-zinc-400'
                          }`}
                        >
                          {shot.imageStatus}
                        </span>
                      </div>
                      <div className="mt-2 space-y-2">
                        <div>
                          <p className="text-xs text-zinc-400">口播文案</p>
                          <p className="mt-0.5 text-sm leading-6 text-zinc-800">{shot.narration}</p>
                        </div>
                        {shot.sceneDesc && (
                          <div>
                            <p className="text-xs text-zinc-400">画面</p>
                            <p className="mt-0.5 text-sm leading-6 text-zinc-600">{shot.sceneDesc}</p>
                          </div>
                        )}
                        {shot.imagePrompt && (
                          <details className="rounded-lg bg-zinc-50 p-2">
                            <summary className="cursor-pointer text-xs text-zinc-500">
                              seedance 提示词
                            </summary>
                            <p className="mt-1 text-xs leading-5 text-zinc-600">{shot.imagePrompt}</p>
                          </details>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
