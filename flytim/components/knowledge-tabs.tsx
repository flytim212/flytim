'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/knowledge', label: '资源库', exact: true },
  { href: '/knowledge/cards', label: '概念卡' },
  { href: '/knowledge/notes', label: '课程笔记' },
  { href: '/knowledge/cases', label: '案例库' },
  { href: '/knowledge/quotes', label: '金句库' },
]

export default function KnowledgeTabs() {
  const pathname = usePathname()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h1 className="mr-2 text-xl font-semibold text-zinc-900">知识库</h1>
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              active
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
