import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CATEGORIES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

// AI 接入：一次拉取工作台全局上下文
// 用途：AI 助手了解「我是谁、在做什么、进展如何」，为写稿/选题/复盘提供依据
export async function GET() {
  const [
    topics,
    contents,
    metrics,
    cards,
    sources,
    cases,
    quotes,
    benchmarks,
    settings,
  ] = await Promise.all([
    prisma.topic.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, title: true, hook: true, category: true, status: true, linkedCardId: true, linkedBenchmarkId: true, audience: true, demand: true, painPoint: true, solution: true, createdAt: true } }),
    prisma.content.findMany({ where: { publishedDate: { not: null } }, orderBy: { publishedDate: 'desc' }, select: { id: true, topicId: true, publishedDate: true, wordCount: true, durationEst: true } }),
    prisma.metric.findMany({ orderBy: { date: 'desc' }, take: 200 }),
    prisma.card.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, title: true, oneLiner: true, status: true, source: true } }),
    prisma.source.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, type: true, title: true, author: true, status: true } }),
    prisma.case.findMany({ orderBy: { date: 'desc' }, select: { id: true, date: true, trigger: true, emotionType: true, usableAsTopic: true } }),
    prisma.quote.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, text: true, source: true } }),
    prisma.benchmark.findMany({ orderBy: { likes: 'desc' }, take: 30, select: { id: true, title: true, author: true, likes: true, views: true, status: true, opening: true, argument: true, ending: true, whyHit: true } }),
    prisma.setting.findUnique({ where: { key: 'customBannedWords' } }),
  ])

  // 分类聚合（最近 200 条数据记录）
  const byCategory = CATEGORIES.map((category) => {
    const catTopics = new Set(topics.filter((t) => t.category === category).map((t) => t.id))
    const catContents = contents.filter((c) => catTopics.has(c.topicId)).map((c) => c.id)
    const catMetrics = metrics.filter((m) => catContents.includes(m.contentId))
    return {
      category,
      publishedCount: catContents.length,
      avgLikes: catMetrics.length
        ? Math.round(catMetrics.reduce((s, m) => s + m.likes, 0) / catMetrics.length)
        : null,
      avgCompletionFull:
        catMetrics.filter((m) => m.completionFull != null).length > 0
          ? Math.round(
              (catMetrics
                .filter((m) => m.completionFull != null)
                .reduce((s, m) => s + (m.completionFull ?? 0), 0) /
                catMetrics.filter((m) => m.completionFull != null).length) *
                10,
            ) / 10
          : null,
    }
  })

  let customBannedWords: string[] = []
  if (settings) {
    try {
      const parsed = JSON.parse(settings.value)
      if (Array.isArray(parsed)) customBannedWords = parsed
    } catch {
      // 忽略
    }
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    // 创作漏斗各环节计数
    counts: {
      topics: topics.length,
      topicsByStatus: Object.fromEntries(
        ['待写', '已写稿', '已发布', '已废弃'].map((s) => [
          s,
          topics.filter((t) => t.status === s).length,
        ]),
      ),
      publishedContents: contents.length,
      metricRecords: metrics.length,
      cards: cards.length,
      cardsByStatus: Object.fromEntries(
        ['待补经历', '可写稿', '已发布'].map((s) => [
          s,
          cards.filter((c) => c.status === s).length,
        ]),
      ),
      sources: sources.length,
      cases: cases.length,
      casesUsableAsTopic: cases.filter((c) => c.usableAsTopic).length,
      quotes: quotes.length,
    },
    // 哪类内容在被验证
    categoryPerformance: byCategory,
    // 最近的选题（供续写/排期）
    recentTopics: topics.slice(0, 10),
    // 最近的迭代日志（反馈循环）
    recentIterationNotes: metrics
      .filter((m) => m.iterationNote)
      .slice(0, 10)
      .map((m) => ({
        date: m.date,
        platform: m.platform,
        note: m.iterationNote,
        likes: m.likes,
        views: m.views,
      })),
    // 概念卡/金句/可用案例（写稿素材）
    cards,
    quotes,
    casesUsable: cases.filter((c) => c.usableAsTopic),
    sources,
    // 对标爆款（洗稿素材源：同赛道博主的爆款拆解）
    benchmarks,
    // 写稿约束
    writingRules: {
      charsPerSecond: 4.5,
      durationWarnSeconds: 75,
      builtinBannedWords: [
        '修行',
        '悟道',
        '知行合一',
        '认知升级',
        '格局',
        '内耗',
        '觉醒',
        '带你',
        '包赚',
      ],
      customBannedWords,
      structure: ['钩子（前3秒）', '事件', '内心实况', '方法', '结尾互动提问'],
      // 选题定位框架：新建选题时应先想清这四要素（POST /api/topics 支持同名可选字段）
      topicPositioning: ['audience 核心人群', 'demand 需求问题', 'painPoint 痛点', 'solution 解决方案'],
      // 生产纪律：选题限时 2 分钟，写稿+剪辑限时 5 分钟/条
      timeLimits: { topicMinutes: 2, scriptMinutes: 5 },
      // 洗稿纪律：一查二改三创新，只洗开场白/核心观点+论证/结尾三维度；论证必须换成用户自己的真实经历
      rewriteRules: {
        steps: '一查（拆对标）→ 二改（换经历论证）→ 三创新（结构借、魂是自己的）',
        dimensions: ['开场白', '核心观点+论证', '结尾'],
      },
    },
    // 可用端点索引（AI 自助发现）
    api: {
      topics: 'GET/POST /api/topics, PATCH/DELETE /api/topics/{id}',
      benchmarks: 'GET/POST /api/benchmarks, GET/PATCH/DELETE /api/benchmarks/{id}（对标爆款，POST 支持 items 批量）',
      contents: 'GET/POST /api/contents, GET/PATCH/DELETE /api/contents/{id}',
      metrics: 'GET/POST /api/metrics, PATCH/DELETE /api/metrics/{id}',
      sources: 'GET/POST /api/sources, PATCH/DELETE /api/sources/{id}',
      cards: 'GET/POST /api/cards, GET/PATCH/DELETE /api/cards/{id}',
      notes: 'GET/POST /api/notes, PATCH/DELETE /api/notes/{id}',
      cases: 'GET/POST /api/cases, PATCH/DELETE /api/cases/{id}',
      quotes: 'GET/POST /api/quotes, PATCH/DELETE /api/quotes/{id}',
      search: 'GET /api/ai/search?q=关键词',
      docs: 'GET /api-docs（HTML 文档页）',
    },
  })
}
