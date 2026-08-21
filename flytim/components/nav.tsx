'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: '首页' },
  { href: '/topics', label: '选题库' },
  { href: '/benchmarks', label: '对标库' },
  { href: '/storyboards', label: '分镜' },
  { href: '/calendar', label: '发布日历' },
  { href: '/metrics', label: '数据中心' },
  { href: '/knowledge', label: '知识库' },
  { href: '/api-docs', label: 'API' },
  { href: '/settings', label: '设置' },
]

export default function Nav() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:gap-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight text-zinc-900">
            flytim
          </span>
          <span className="hidden text-xs text-zinc-400 sm:inline">
            内容工作台
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active =
              l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  active
                    ? 'rounded-md bg-zinc-900 px-3 py-1.5 text-white'
                    : 'rounded-md px-3 py-1.5 text-zinc-500 transition-colors hover:text-zinc-900'
                }
              >
                {l.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
