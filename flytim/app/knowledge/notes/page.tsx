'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { NoteDTO } from '@/lib/types'

const INPUT_CLS =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500'

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteDTO[] | null>(null)
  const [course, setCourse] = useState('')

  const [form, setForm] = useState({ course: '', episode: '', content: '' })
  const [editing, setEditing] = useState<NoteDTO | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/notes')
    setNotes(await res.json())
  }

  useEffect(() => {
    load()
  }, [])

  // 课程 → 笔记 两级归档
  const byCourse = useMemo(() => {
    const map = new Map<string, NoteDTO[]>()
    for (const n of notes ?? []) {
      const list = map.get(n.course) ?? []
      list.push(n)
      map.set(n.course, list)
    }
    return Array.from(map.entries())
  }, [notes])

  const current = course ? (byCourse.find(([c]) => c === course)?.[1] ?? []) : []

  async function save() {
    const payload = editing ?? form
    if (!payload.course.trim()) {
      setError('课程名不能为空')
      return
    }
    setSaving(true)
    const res = await fetch(editing ? `/api/notes/${editing.id}` : '/api/notes', {
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
    setForm({ course: course, episode: '', content: '' })
    setEditing(null)
    load()
  }

  async function del(n: NoteDTO) {
    if (!window.confirm(`删除「${n.episode || n.course}」这条笔记？`)) return
    await fetch(`/api/notes/${n.id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      {/* 左：课程列表 */}
      <aside className="w-full shrink-0 space-y-2 lg:w-56">
        <button
          onClick={() => setCourse('')}
          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
            course === '' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          新建笔记
        </button>
        {byCourse.map(([name, list]) => (
          <button
            key={name}
            onClick={() => setCourse(name)}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              course === name ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <span className="block truncate">{name}</span>
            <span className={`text-xs ${course === name ? 'text-zinc-300' : 'text-zinc-400'}`}>
              {list.length} 集
            </span>
          </button>
        ))}
        {notes !== null && byCourse.length === 0 && (
          <p className="px-3 py-4 text-xs text-zinc-400">还没有课程笔记</p>
        )}
      </aside>

      {/* 右：编辑 / 阅读 */}
      <div className="min-w-0 flex-1 space-y-4">
        {editing || course === '' ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-medium text-zinc-700">
              {editing ? '编辑笔记' : '新建笔记'}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-zinc-400">课程 *</span>
                <input
                  list="course-names"
                  value={(editing ?? form).course}
                  onChange={(e) =>
                    editing
                      ? setEditing({ ...editing, course: e.target.value })
                      : setForm({ ...form, course: e.target.value })
                  }
                  placeholder="如：口播表达训练营"
                  className={INPUT_CLS}
                />
                <datalist id="course-names">
                  {byCourse.map(([name]) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-400">集数</span>
                <input
                  value={(editing ?? form).episode}
                  onChange={(e) =>
                    editing
                      ? setEditing({ ...editing, episode: e.target.value })
                      : setForm({ ...form, episode: e.target.value })
                  }
                  placeholder="如：第 3 集 · 开头"
                  className={INPUT_CLS}
                />
              </label>
            </div>
            <div className="mt-3 space-y-1">
              <span className="text-xs text-zinc-400">内容（支持 markdown）</span>
              <textarea
                value={(editing ?? form).content}
                onChange={(e) =>
                  editing
                    ? setEditing({ ...editing, content: e.target.value })
                    : setForm({ ...form, content: e.target.value })
                }
                rows={10}
                className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-amber-500"
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
              >
                保存
              </button>
              {editing && (
                <button
                  onClick={() => setEditing(null)}
                  className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900"
                >
                  取消
                </button>
              )}
              {error && <span className="text-xs text-red-500">{error}</span>}
            </div>
          </section>
        ) : (
          notes === null && <p className="py-10 text-center text-sm text-zinc-400">加载中…</p>
        )}

        {course !== '' && (
          <section className="space-y-3">
            {current.map((n) => (
              <article key={n.id} className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-zinc-900">{n.episode || '未命名'}</h3>
                  <div className="ml-auto flex gap-3 text-xs">
                    <button
                      onClick={() => setEditing(n)}
                      className="text-zinc-500 hover:text-zinc-900"
                    >
                      编辑
                    </button>
                    <button onClick={() => del(n)} className="text-zinc-400 hover:text-red-500">
                      删除
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-sm leading-7 text-zinc-700">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{n.content}</ReactMarkdown>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
