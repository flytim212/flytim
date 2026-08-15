import React from 'react'

export const CATEGORY_STYLE: Record<string, string> = {
  故事: 'border-amber-200 bg-amber-50 text-amber-700',
  方法: 'border-sky-200 bg-sky-50 text-sky-700',
  工具: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

export const TOPIC_STATUS_STYLE: Record<string, string> = {
  待写: 'border-zinc-200 bg-zinc-100 text-zinc-500',
  已写稿: 'border-sky-200 bg-sky-50 text-sky-700',
  已发布: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  已废弃: 'border-red-200 bg-red-50 text-red-600',
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
