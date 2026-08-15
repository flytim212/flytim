import Link from 'next/link'

const MODULES = [
  {
    href: '/topics',
    title: '选题库',
    desc: '管理选题的标题、钩子、分类与状态，点「写稿」直接进入编辑器。',
  },
  {
    href: '/calendar',
    title: '发布日历',
    desc: '月历视图，计划日与实际发布日一目了然，一眼看出断更。',
  },
]

export default function Home() {
  return (
    <div className="flex flex-col gap-8 pt-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          内容工作台
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          灵感 → 选题 → 写稿 → 发布 → 数据 → 迭代
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {MODULES.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
          >
            <div className="text-lg font-medium">{m.title}</div>
            <p className="mt-1.5 text-sm leading-6 text-zinc-400">{m.desc}</p>
          </Link>
        ))}
      </div>

      <p className="text-xs text-zinc-600">
        后续模块：数据中心 · 知识库 · 灵感箱 · 复盘（按阶段开发中）
      </p>
    </div>
  )
}
