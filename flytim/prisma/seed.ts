// 种子数据：示例选题、文案、作品数据（替换为你自己的真实数据即可）
// 各部分独立判断：已有数据时跳过，可重复执行
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 相对今天偏移 N 天的日期（UTC 零点，纯日期用途）
function dateOffset(days: number): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

const SAMPLE_BODY = `【钩子（前3秒）】
日更第 17 天那条视频，播放量比我前 16 条加起来还高。

【事件】
前 16 条，每条我都改到凌晨，数据一条比一条惨。

【内心实况】
那段时间最大的内耗，是每天醒来第一件事看后台，然后告诉自己「再坚持一下」。

【方法】
第 17 条我只改了一件事：把开头三秒从「大家好」换成了一句真话。

【结尾互动提问】
你最近一条数据好的视频，开头三秒说的是什么？评论区告诉我。
`

async function seedTopics() {
  const topics = await Promise.all(
    [
      { title: '31 岁重新开始，我删掉了记录三年的账号', hook: '按下删除键的那一刻，我的手是抖的。', category: '故事', status: '已写稿' },
      { title: '被裁员那天，我在楼下坐了四个小时', hook: 'HR 说「这不是你的问题」，我知道就是我的问题。', category: '故事', status: '待写' },
      { title: '不靠意志力的早起法，我用了 200 天', hook: '每天早起第一件事，我只做这一件。', category: '方法', status: '待写' },
      { title: '情绪上头时，先给自己 60 秒', hook: '上头时做的决定，90% 我都会后悔。', category: '方法', status: '待写' },
      { title: '我用一个表格管理所有选题', hook: '创作者最贵的不是时间，是想法。', category: '工具', status: '待写' },
      { title: '这三个免费工具，撑起我全部内容生产', hook: '别再为工具花钱了。', category: '工具', status: '待写' },
      { title: '连续日更 30 天，数据教会我一件事', hook: '第 17 天那条视频，比我前 16 条加起来还高。', category: '故事', status: '已发布' },
      { title: '如何把一次崩溃变成一条视频', hook: '崩溃不能白崩。', category: '方法', status: '已发布' },
    ].map((t) => prisma.topic.create({ data: t })),
  )

  // 选题 1：已写稿，计划明天发布
  await prisma.content.create({
    data: { topicId: topics[0].id, plannedDate: dateOffset(1), status: '写稿中' },
  })

  // 选题 7（故事）：3 天前发布（正文含禁词「内耗」，用于演示禁词检查）
  await prisma.content.create({
    data: {
      topicId: topics[6].id,
      body: SAMPLE_BODY,
      wordCount: SAMPLE_BODY.replace(/\s+/g, '').length,
      durationEst: Math.round(SAMPLE_BODY.replace(/\s+/g, '').length / 4.5),
      plannedDate: dateOffset(-3),
      publishedDate: dateOffset(-3),
      status: '已发布',
    },
  })

  // 选题 8（方法）：9 天前发布
  await prisma.content.create({
    data: {
      topicId: topics[7].id,
      body: SAMPLE_BODY,
      wordCount: SAMPLE_BODY.replace(/\s+/g, '').length,
      durationEst: Math.round(SAMPLE_BODY.replace(/\s+/g, '').length / 4.5),
      plannedDate: dateOffset(-9),
      publishedDate: dateOffset(-9),
      status: '已发布',
    },
  })

  console.log(`已写入 ${topics.length} 条示例选题、3 条文案。`)
}

async function seedMetrics() {
  if ((await prisma.metric.count()) > 0) return

  const published = await prisma.content.findMany({
    where: { publishedDate: { not: null } },
    orderBy: { publishedDate: 'asc' },
  })
  if (published.length === 0) return
  const [methodC, storyC] = published // 方法类发布更早，数据更多

  const rows: {
    contentId: number
    platform: string
    date: Date
    views: number
    completion3s: number
    completionFull: number
    likes: number
    comments: number
    saves: number
    shares: number
    newFans: number
    iterationNote: string
  }[] = []

  // 方法类 · 抖音 · 发布日起 9 天（最后一条爆了，第 5 天扑了）
  const dy = {
    views: [800, 1200, 1500, 900, 2000, 2400, 1800, 3000, 5200],
    c3s: [28, 32, 35, 26, 38, 40, 33, 44, 52],
    cFull: [6, 8, 9, 5, 11, 13, 8, 15, 22],
    likes: [60, 110, 150, 70, 210, 280, 160, 360, 640],
    comments: [3, 6, 9, 4, 12, 15, 8, 22, 41],
    saves: [10, 22, 31, 12, 45, 60, 30, 80, 150],
    shares: [2, 5, 8, 3, 10, 14, 7, 18, 35],
    fans: [1, 3, 5, 2, 8, 10, 5, 15, 28],
  }
  dy.views.forEach((v, i) => {
    const off = 9 - i
    rows.push({
      contentId: methodC.id,
      platform: '抖音',
      date: dateOffset(-off),
      views: v,
      completion3s: dy.c3s[i],
      completionFull: dy.cFull[i],
      likes: dy.likes[i],
      comments: dy.comments[i],
      saves: dy.saves[i],
      shares: dy.shares[i],
      newFans: dy.fans[i],
      iterationNote:
        off === 1
          ? '爆了：把结论放开头当钩子，3秒完播直接拉高，方法类以后都先写结果'
          : off === 5
            ? '扑了：开头铺背景太久，前3秒没信息量'
            : '',
    })
  })

  // 方法类 · 小红书 · 隔天 4 条
  const xhs = {
    views: [400, 650, 900, 1500],
    c3s: [40, 44, 48, 55],
    cFull: [9, 11, 14, 18],
    likes: [35, 60, 90, 170],
    comments: [2, 4, 7, 12],
    saves: [8, 15, 26, 55],
    shares: [1, 2, 4, 8],
    fans: [0, 1, 2, 5],
  }
  xhs.views.forEach((v, i) => {
    rows.push({
      contentId: methodC.id,
      platform: '小红书',
      date: dateOffset(-(8 - i * 2)),
      views: v,
      completion3s: xhs.c3s[i],
      completionFull: xhs.cFull[i],
      likes: xhs.likes[i],
      comments: xhs.comments[i],
      saves: xhs.saves[i],
      shares: xhs.shares[i],
      newFans: xhs.fans[i],
      iterationNote: '',
    })
  })

  // 故事类 · 抖音 · 发布日起 3 天
  const story = {
    views: [2600, 3300, 4100],
    c3s: [30, 34, 38],
    cFull: [7, 9, 12],
    likes: [230, 310, 420],
    comments: [18, 25, 36],
    saves: [40, 58, 82],
    shares: [9, 13, 20],
    fans: [6, 9, 14],
  }
  story.views.forEach((v, i) => {
    rows.push({
      contentId: storyC.id,
      platform: '抖音',
      date: dateOffset(-(3 - i)),
      views: v,
      completion3s: story.c3s[i],
      completionFull: story.cFull[i],
      likes: story.likes[i],
      comments: story.comments[i],
      saves: story.saves[i],
      shares: story.shares[i],
      newFans: story.fans[i],
      iterationNote: i === 0 ? '故事类收藏明显偏高，情绪共鸣带动收藏，值得加配比' : '',
    })
  })

  await prisma.metric.createMany({ data: rows })
  console.log(`已写入 ${rows.length} 条演示数据。`)
}

async function main() {
  if ((await prisma.topic.count()) === 0) await seedTopics()
  await seedMetrics()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
