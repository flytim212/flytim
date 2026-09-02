/** 模块二：范围训练（阶段 2 开放，占位页） */
export default function RangePage() {
  return (
    <Placeholder
      title="范围训练"
      stage="阶段 2"
      desc="将提供 169 格范围的记忆训练：给定位置与场景，练习还原开局 / 反加 / 跟注范围，支持教练定制范围数据的 JSON 导入导出。"
    />
  )
}

export function Placeholder({ title, stage, desc }: { title: string; stage: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-black/25 border border-gold/30 flex items-center justify-center">
        <span className="text-3xl text-gold/70">♠</span>
      </div>
      <h1 className="mt-4 text-lg font-black text-stone-100">{title}</h1>
      <span className="mt-2 text-[11px] font-bold text-stone-900 bg-stone-400 rounded px-2 py-0.5">{stage} 开放</span>
      <p className="mt-4 text-xs leading-relaxed text-stone-400 max-w-xs">{desc}</p>
    </div>
  )
}
