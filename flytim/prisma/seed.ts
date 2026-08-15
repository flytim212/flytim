// 种子数据：示例选题 + 两条文案（替换为你自己的 30 条选题即可）
// 重复执行安全：已有选题时跳过
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

async function main() {
  const count = await prisma.topic.count()
  if (count > 0) {
    console.log(`已有 ${count} 条选题，跳过种子数据。`)
    return
  }

  const topics = await Promise.all(
    [
      { title: '31 岁重新开始，我删掉了记录三年的账号', hook: '按下删除键的那一刻，我的手是抖的。', category: '故事', status: '已写稿' },
      { title: '被裁员那天，我在楼下坐了四个小时', hook: 'HR 说「这不是你的问题」，我知道就是我的问题。', category: '故事', status: '待写' },
      { title: '不靠意志力的早起法，我用了 200 天', hook: '每天早起第一件事，我只做这一件。', category: '方法', status: '待写' },
      { title: '情绪上头时，先给自己 60 秒', hook: '上头时做的决定，90% 我都会后悔。', category: '方法', status: '待写' },
      { title: '我用一个表格管理所有选题', hook: '创作者最贵的不是时间，是想法。', category: '工具', status: '待写' },
      { title: '这三个免费工具，撑起我全部内容生产', hook: '别再为工具花钱了。', category: '工具', status: '待写' },
      { title: '连续日更 30 天，数据教会我一件事', hook: '第 17 天那条视频，比我前 16 条加起来还高。', category: '故事', status: '已发布' },
      { title: '如何把一次崩溃变成一条视频', hook: '崩溃不能白崩。', category: '方法', status: '待写' },
    ].map((t) => prisma.topic.create({ data: t })),
  )

  // 选题 1：已写稿，计划明天发布
  await prisma.content.create({
    data: {
      topicId: topics[0].id,
      plannedDate: dateOffset(1),
      status: '写稿中',
    },
  })

  // 选题 7：已发布（正文含禁词「内耗」，用于演示禁词检查）
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

  console.log(`已写入 ${topics.length} 条示例选题、2 条文案。`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
