import Editor from '@/components/editor'

export default function ContentEditorPage({
  params,
}: {
  params: { id: string }
}) {
  return <Editor id={Number(params.id)} />
}
