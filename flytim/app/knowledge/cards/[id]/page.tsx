import CardDetail from './card-detail'

export default function CardDetailPage({ params }: { params: { id: string } }) {
  return <CardDetail id={Number(params.id)} />
}
