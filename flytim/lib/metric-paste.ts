// 粘贴解析：把创作者后台复制的一串数据文字解析成结构化字段
// 例："播放量 1.2万 点赞 356 评论 23 收藏 45 转发 12 涨粉 8 3秒完播率 25.3% 完播率 11.2%"

export type MetricNums = {
  views?: number
  completion3s?: number
  completionFull?: number
  likes?: number
  comments?: number
  saves?: number
  shares?: number
  newFans?: number
}

// "1.2万" "3,456" "25.3%" → 数字；不合法返回 null
function toNumber(raw: string): number | null {
  const s = raw.replace(/[,，\s]/g, '').replace(/%$/, '')
  const m = s.match(/^(\d+(?:\.\d+)?)(亿|万|千|w|W|k|K)?$/)
  if (!m) return null
  let n = Number(m[1])
  if (m[2] === '亿') n *= 1e8
  else if (m[2] === '万' || m[2] === 'w' || m[2] === 'W') n *= 1e4
  else if (m[2] === '千' || m[2] === 'k' || m[2] === 'K') n *= 1e3
  return Math.round(n * 10) / 10
}

// 字段别名，按长度倒序匹配，保证「3秒完播率」优先于「完播率」、「点赞量」优先于「赞」
const ALIAS_LIST: { key: keyof MetricNums; alias: string }[] = [
  { key: 'completion3s', alias: '3秒完播率' },
  { key: 'completion3s', alias: '3秒完播' },
  { key: 'completion3s', alias: '3s完播率' },
  { key: 'completion3s', alias: '3s完播' },
  { key: 'completionFull', alias: '完播率' },
  { key: 'completionFull', alias: '完播' },
  { key: 'views', alias: '播放量' },
  { key: 'views', alias: '播放次数' },
  { key: 'views', alias: '播放' },
  { key: 'views', alias: '观看量' },
  { key: 'views', alias: '观看人数' },
  { key: 'views', alias: '观看' },
  { key: 'views', alias: '浏览量' },
  { key: 'views', alias: '浏览' },
  { key: 'views', alias: '曝光量' },
  { key: 'views', alias: '曝光' },
  { key: 'newFans', alias: '新增粉丝' },
  { key: 'newFans', alias: '粉丝增量' },
  { key: 'newFans', alias: '净增粉丝' },
  { key: 'newFans', alias: '涨粉量' },
  { key: 'newFans', alias: '涨粉' },
  { key: 'likes', alias: '点赞量' },
  { key: 'likes', alias: '点赞数' },
  { key: 'likes', alias: '获赞' },
  { key: 'likes', alias: '点赞' },
  { key: 'comments', alias: '评论量' },
  { key: 'comments', alias: '评论数' },
  { key: 'comments', alias: '评论' },
  { key: 'saves', alias: '收藏量' },
  { key: 'saves', alias: '收藏数' },
  { key: 'saves', alias: '收藏' },
  { key: 'shares', alias: '转发量' },
  { key: 'shares', alias: '转发数' },
  { key: 'shares', alias: '转发' },
  { key: 'shares', alias: '分享量' },
  { key: 'shares', alias: '分享数' },
  { key: 'shares', alias: '分享' },
  { key: 'likes', alias: '赞' },
]

const ALIASES = [...ALIAS_LIST].sort((a, b) => b.alias.length - a.alias.length)

// 「标签 数字」或「标签: 数字」，数字支持 1.2万 / 3,456 / 25.3%
export function parseMetricsText(text: string): {
  values: MetricNums
  matched: string[]
} {
  const values: MetricNums = {}
  const matched: string[] = []
  let rest = text

  for (const { key, alias } of ALIASES) {
    if (values[key] != null) continue
    // 别名后跟分隔符再跟数字；「点赞率5%」这类不会被「点赞」误匹配（数字前是「率」）
    const re = new RegExp(
      `${alias}\\s*[:：]?\\s*([\\d.,，]+\\s*[万亿千wkWK]?\\s*%?)`,
    )
    const m = rest.match(re)
    if (!m) continue
    const n = toNumber(m[1])
    if (n == null) continue
    values[key] = n
    matched.push(`${alias} ${n}`)
    // 从原文移除已匹配片段，避免「播放量」被「播放」二次匹配
    rest = rest.replace(m[0], ' ')
  }

  return { values, matched }
}
