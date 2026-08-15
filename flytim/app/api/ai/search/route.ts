import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// AI 接入：全局搜索（跨选题/文案/概念卡/资源/案例/笔记/金句）
// ?q=关键词 &entity=cards（可选，逗号分隔限定实体） &limit=5
const ENTITIES = ['topics', 'contents', 'cards', 'sources', 'cases', 'notes', 'quotes'] as const

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  const limit = Math.min(Number(searchParams.get('limit')) || 5, 20)
  const wanted = (searchParams.get('entity') ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter((e): e is (typeof ENTITIES)[number] =>
      (ENTITIES as readonly string[]).includes(e),
    )
  const want = (e: (typeof ENTITIES)[number]) =>
    wanted.length === 0 || wanted.includes(e)

  if (!q) {
    return NextResponse.json(
      { error: '缺少 q 参数', example: '/api/ai/search?q=课题分离' },
      { status: 400 },
    )
  }

  const [topics, contents, cards, sources, cases, notes, quotes] =
    await Promise.all([
      want('topics')
        ? prisma.topic.findMany({
            where: { OR: [{ title: { contains: q } }, { hook: { contains: q } }] },
            select: { id: true, title: true, hook: true, category: true, status: true },
            take: limit,
          })
        : [],
      want('contents')
        ? prisma.content.findMany({
            where: { body: { contains: q } },
            select: { id: true, topicId: true, body: true, status: true },
            take: limit,
          })
        : [],
      want('cards')
        ? prisma.card.findMany({
            where: {
              OR: [
                { title: { contains: q } },
                { oneLiner: { contains: q } },
                { keyPoints: { contains: q } },
                { myExperience: { contains: q } },
                { scriptDraft: { contains: q } },
              ],
            },
            select: { id: true, title: true, oneLiner: true, status: true },
            take: limit,
          })
        : [],
      want('sources')
        ? prisma.source.findMany({
            where: {
              OR: [
                { title: { contains: q } },
                { author: { contains: q } },
                { tags: { contains: q } },
                { description: { contains: q } },
              ],
            },
            select: { id: true, type: true, title: true, author: true, status: true },
            take: limit,
          })
        : [],
      want('cases')
        ? prisma.case.findMany({
            where: {
              OR: [
                { trigger: { contains: q } },
                { bodySignal: { contains: q } },
                { action: { contains: q } },
                { result: { contains: q } },
              ],
            },
            select: { id: true, date: true, trigger: true, emotionType: true },
            take: limit,
          })
        : [],
      want('notes')
        ? prisma.note.findMany({
            where: {
              OR: [
                { course: { contains: q } },
                { episode: { contains: q } },
                { content: { contains: q } },
              ],
            },
            select: { id: true, course: true, episode: true, content: true },
            take: limit,
          })
        : [],
      want('quotes')
        ? prisma.quote.findMany({
            where: { OR: [{ text: { contains: q } }, { source: { contains: q } }] },
            select: { id: true, text: true, source: true },
            take: limit,
          })
        : [],
    ])

  return NextResponse.json({
    query: q,
    total:
      topics.length +
      contents.length +
      cards.length +
      sources.length +
      cases.length +
      notes.length +
      quotes.length,
    results: {
      topics,
      contents: contents.map((c) => ({
        id: c.id,
        topicId: c.topicId,
        status: c.status,
        excerpt: c.body.slice(0, 120),
      })),
      cards,
      sources,
      cases,
      notes: notes.map((n) => ({
        id: n.id,
        course: n.course,
        episode: n.episode,
        excerpt: n.content.slice(0, 120),
      })),
      quotes,
    },
  })
}
