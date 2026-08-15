import React from 'react'

export const CATEGORY_STYLE: Record<string, string> = {
  故事: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  方法: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
  工具: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
}

export const TOPIC_STATUS_STYLE: Record<string, string> = {
  待写: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400',
  已写稿: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
  已发布: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  已废弃: 'border-red-500/20 bg-red-500/10 text-red-400',
}

export function Badge({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs leading-4 ${className}`}
    >
      {children}
    </span>
  )
}
