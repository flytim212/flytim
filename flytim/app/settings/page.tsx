'use client'

import { useEffect, useRef, useState } from 'react'

const INPUT_CLS =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500'

const PRESETS = [
  { label: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4.5v' },
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k-vision-preview' },
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
]

type ConfigDTO = {
  baseUrl: string
  model: string
  imageModel: string
  hasKey: boolean
  maskedKey: string
}

export default function SettingsPage() {
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [imageModel, setImageModel] = useState('')
  const [loaded, setLoaded] = useState<ConfigDTO | null>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(false)
  const keyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/settings/ai')
      .then((r) => r.json())
      .then((d: ConfigDTO) => {
        setLoaded(d)
        setBaseUrl(d.baseUrl)
        setModel(d.model)
        setImageModel(d.imageModel)
      })
  }, [])

  async function save() {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/settings/ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl,
        model,
        imageModel,
        // 输入框为空 = 不改 key（掩码提示占位）
        apiKey: apiKey.trim() || undefined,
      }),
    })
    setSaving(false)
    const d = await res.json()
    if (!res.ok) {
      setMsgOk(false)
      setMsg(d.error || '保存失败')
      return
    }
    setLoaded(d)
    setApiKey('')
    setMsgOk(true)
    setMsg('已保存 ✓')
  }

  async function test() {
    setTesting(true)
    setMsg('')
    // 先保存当前表单（含 key），再测
    await fetch('/api/settings/ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl,
        model,
        imageModel,
        apiKey: apiKey.trim() || undefined,
      }),
    })
    const res = await fetch('/api/ai/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl, model, apiKey: apiKey.trim() || undefined }),
    })
    setTesting(false)
    const d = await res.json()
    setMsgOk(d.ok)
    setMsg(d.ok ? `连接成功，模型「${d.model}」回复：${d.reply}` : d.error || '测试失败')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">设置</h1>
        <p className="mt-1 text-sm text-zinc-500">
          配置 AI 服务后，工作台就能自己调 AI（截图识别数据等）。任何 OpenAI 兼容接口都可以。
        </p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-700">AI 服务</h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setBaseUrl(p.baseUrl)
                setModel(p.model)
              }}
              className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                baseUrl === p.baseUrl
                  ? 'border-amber-400 bg-amber-50 text-amber-700'
                  : 'border-zinc-200 bg-white text-zinc-500 hover:border-amber-300 hover:text-amber-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">接口地址（Base URL）</span>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://open.bigmodel.cn/api/paas/v4"
              className={INPUT_CLS}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">模型（文本/视觉）</span>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="glm-4.5v（截图识别需视觉模型）"
              className={INPUT_CLS}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">图片生成模型</span>
            <input
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value)}
              placeholder="cogman-1.5-flash（分镜图片生成用）"
              className={INPUT_CLS}
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs text-zinc-400">
              API Key
              {loaded?.hasKey && (
                <span className="ml-2 text-emerald-600">
                  已配置（{loaded.maskedKey}）{apiKey.trim() ? '，输入新值将覆盖' : '，留空保持不变'}
                </span>
              )}
            </span>
            <input
              ref={keyRef}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={loaded?.hasKey ? loaded.maskedKey : 'sk-…'}
              className={INPUT_CLS}
              autoComplete="new-password"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={save}
            disabled={saving || !baseUrl.trim() || !model.trim()}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存'}
          </button>
          <button
            onClick={test}
            disabled={testing || !baseUrl.trim() || !model.trim()}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-amber-400 hover:text-amber-700 disabled:opacity-50"
          >
            {testing ? '测试中…' : '保存并测试连接'}
          </button>
          {msg && (
            <span className={`text-xs ${msgOk ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</span>
          )}
        </div>

        <p className="mt-4 text-xs leading-6 text-zinc-400">
          说明：Key 保存在本地 SQLite（Setting 表），不会出现在任何 GET
          接口里（回显只有掩码）。截图识别数据需要用视觉模型（如 glm-4.5v / gpt-4o-mini / moonshot-v1-vision）。
        </p>
      </section>
    </div>
  )
}
