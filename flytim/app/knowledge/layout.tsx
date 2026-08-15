import KnowledgeTabs from '@/components/knowledge-tabs'

export default function KnowledgeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-5">
      <KnowledgeTabs />
      {children}
    </div>
  )
}
