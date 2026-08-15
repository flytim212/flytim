'use client'

import { useEffect, useState } from 'react'

const GROUPS: {
  name: string
  desc: string
  endpoints: {
    method: string
    path: string
    desc: string
    example?: string
  }[]
}[] = [
  {
    name: 'AI 接入（推荐入口）',
    desc: '给 AI 助手 / 自动化脚本用的两个总入口，先调这两个，再按需调具体资源端点。',
    endpoints: [
      {
        method: 'GET',
        path: '/api/ai/overview',
        desc: '一次拉取全工作台上下文：各模块计数、分类表现、最近选题与迭代日志、概念卡/金句素材、写稿规则（禁词/时长/结构）、全部端点索引',
        example: 'curl {origin}/api/ai/overview',
      },
      {
        method: 'GET',
        path: '/api/ai/search?q=关键词&limit=5',
        desc: '跨七张表全局搜索：选题/文案/概念卡/资源/案例/笔记/金句，返回分组结果与摘要',
        example: 'curl "{origin}/api/ai/search?q=课题分离"',
      },
      {
        method: 'POST',
        path: '/api/ai/parse-metrics',
        desc: '把创作者后台复制的数据文字解析成结构化字段（播放/点赞/完播率…，支持 万/逗号/% 单位），返回 {values, matched}',
        example: 'curl -X POST {origin}/api/ai/parse-metrics -H "Content-Type: application/json" -d \'{"text":"播放量 1.2万 点赞 356 3秒完播率 25.3%"}\'',
      },
      {
        method: 'POST',
        path: '/api/ai/vision-metrics',
        desc: '截图识别数据：传创作者后台截图（dataURL），用「设置」里配好的视觉模型读数，返回 {values, matched}',
        example: 'curl -X POST {origin}/api/ai/vision-metrics -H "Content-Type: application/json" -d \'{"image":"data:image/png;base64,…"}\'',
      },
      {
        method: 'POST',
        path: '/api/ai/test',
        desc: '测试 AI 服务连通性（用已保存的配置发一句话），返回 {ok, reply, model}',
      },
      {
        method: 'GET · PUT',
        path: '/api/settings/ai',
        desc: 'AI 服务配置：GET 读取（key 只回掩码）；PUT 保存 {baseUrl, apiKey, model}（apiKey 留空=保持不变）。任何 OpenAI 兼容接口均可',
      },
    ],
  },
  {
    name: '选题与文案',
    desc: '内容生产主线。',
    endpoints: [
      { method: 'GET', path: '/api/topics?category=故事&status=待写', desc: '选题列表（可筛选）' },
      { method: 'POST', path: '/api/topics', desc: '新建选题 {title, hook, category, status, linkedCardId?}' },
      { method: 'PATCH', path: '/api/topics/{id}', desc: '更新选题' },
      { method: 'DELETE', path: '/api/topics/{id}', desc: '删除选题（级联删除文案）' },
      { method: 'POST', path: '/api/contents', desc: '进入写稿（get-or-create）{topicId} → 返回文案 id' },
      { method: 'PATCH', path: '/api/contents/{id}', desc: '保存正文/状态/计划日/发布日，自动算字数与时长（4.5字/秒）' },
    ],
  },
  {
    name: '数据中心',
    desc: '作品数据回收与迭代。',
    endpoints: [
      { method: 'GET', path: '/api/metrics', desc: '数据记录列表（含内容标题与分类）' },
      { method: 'POST', path: '/api/metrics', desc: '录数据 {contentId, platform(抖音|小红书), date, views, completion3s, completionFull, likes, comments, saves, shares, newFans, iterationNote}' },
      { method: 'PATCH', path: '/api/metrics/{id}', desc: '改数值/迭代备注' },
      { method: 'DELETE', path: '/api/metrics/{id}', desc: '删除记录' },
    ],
  },
  {
    name: '知识库',
    desc: '资源库（书籍/视频/课程…）+ 概念卡 + 课程笔记 + 案例库 + 金句库。',
    endpoints: [
      { method: 'GET', path: '/api/sources?type=书籍&status=进行中&q=关键词', desc: '资源列表' },
      { method: 'POST', path: '/api/sources', desc: '导入：单条 {type,title,author,url,...} 或批量 {items:[…]}' },
      { method: 'PATCH · DELETE', path: '/api/sources/{id}', desc: '更新 / 删除资源' },
      { method: 'GET', path: '/api/cards?status=待补经历&q=关键词', desc: '概念卡列表' },
      { method: 'POST', path: '/api/cards', desc: '新建概念卡（支持批量 items）' },
      { method: 'GET', path: '/api/cards/{id}', desc: '概念卡详情（含关联选题）' },
      { method: 'POST', path: '/api/topics', desc: '概念卡转选题：传 {title, linkedCardId} 即可互相关联' },
      { method: 'GET', path: '/api/notes?course=课程名', desc: '课程笔记（按课程筛选）' },
      { method: 'POST', path: '/api/notes', desc: '新建笔记 {course, episode, content(markdown)}' },
      { method: 'GET', path: '/api/cases?usable=true', desc: '案例列表（?usable=true 只看可用作选题的）' },
      { method: 'POST', path: '/api/cases', desc: '记录案例 {date, trigger, emotionType, bodySignal, action, result, usableAsTopic}' },
      { method: 'GET', path: '/api/quotes?q=关键词', desc: '金句列表' },
      { method: 'POST', path: '/api/quotes', desc: '存金句（支持批量 items）' },
    ],
  },
  {
    name: '配置',
    desc: '写稿辅助配置。',
    endpoints: [
      { method: 'GET', path: '/api/settings', desc: '读取自定义禁词表' },
      { method: 'PUT', path: '/api/settings', desc: '保存自定义禁词表 {customBannedWords:[…]}' },
    ],
  },
]

const METHOD_STYLE: Record<string, string> = {
  GET: 'bg-sky-50 text-sky-700 border-sky-200',
  POST: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PATCH: 'bg-amber-50 text-amber-700 border-amber-200',
  'PATCH · DELETE': 'bg-amber-50 text-amber-700 border-amber-200',
  PUT: 'bg-amber-50 text-amber-700 border-amber-200',
  'GET · PUT': 'bg-sky-50 text-sky-700 border-sky-200',
  DELETE: 'bg-red-50 text-red-600 border-red-200',
}

export default function ApiDocsPage() {
  const [origin, setOrigin] = useState('')
  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])
  const base = origin || 'http://localhost:3000'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">API 接入文档</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          全部功能均已 API 化，无需鉴权（单人本地使用）。给 AI
          编程工具、自动化脚本、快捷指令直接调用。当前服务地址：
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800">
            {base}
          </code>
        </p>
        <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-7">
          <p className="font-medium text-zinc-700">AI 接入建议（写给 AI 的提示词）：</p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs leading-6 text-zinc-100">{`这是一个内容创作工作台的 API（base: ${base}）。
1. 先 GET /api/ai/overview 了解全局：选题进度、分类表现、禁词与结构规则；
2. 需要找素材时用 GET /api/ai/search?q=关键词；
3. 写稿遵守 overview.writingRules（禁词/75秒/五段结构），保存走 POST /api/contents + PATCH /api/contents/{id}；
4. 记灵感、录数据、导书单都是标准 REST：POST /api/topics、/api/metrics、/api/sources。`}</pre>
        </div>
      </div>

      {GROUPS.map((g) => (
        <section
          key={g.name}
          className="rounded-xl border border-zinc-200 bg-white p-5"
        >
          <h2 className="text-base font-medium text-zinc-900">{g.name}</h2>
          <p className="mt-1 text-xs text-zinc-400">{g.desc}</p>
          <ul className="mt-4 space-y-3">
            {g.endpoints.map((e, i) => (
              <li key={i} className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono text-xs font-medium ${METHOD_STYLE[e.method] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}
                  >
                    {e.method}
                  </span>
                  <code className="break-all font-mono text-[13px] text-zinc-900">
                    {e.path}
                  </code>
                </div>
                <p className="mt-1 text-zinc-500">{e.desc}</p>
                {e.example && (
                  <pre className="mt-1.5 overflow-x-auto rounded-lg bg-zinc-950 px-3 py-2 font-mono text-xs leading-6 text-zinc-100">
                    {e.example.replaceAll('{origin}', base)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-xs text-zinc-400">
        提示：列表类 GET 均返回 JSON 数组；写入失败返回 400/404 + {'{error}'}。数据库为本地
        SQLite（prisma/dev.db），随时可备份。
      </p>
    </div>
  )
}
