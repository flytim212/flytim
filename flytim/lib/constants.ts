// 全局常量：分类、状态、禁词、模板、人设红线

export const CATEGORIES = ['故事', '方法', '工具'] as const
export const TOPIC_STATUSES = ['待写', '已写稿', '已发布', '已废弃'] as const
export const CONTENT_STATUSES = ['写稿中', '已定稿', '已发布'] as const
export const PLATFORMS = ['抖音', '小红书'] as const

// 内置禁词（不可删除，可在编辑器另加自定义禁词）
export const BUILTIN_BANNED_WORDS = [
  '修行',
  '悟道',
  '知行合一',
  '认知升级',
  '格局',
  '内耗',
  '觉醒',
  '带你',
  '包赚',
] as const

// 中文口播语速（字/秒）
export const CHARS_PER_SECOND = 4.5
// 时长警告阈值（秒）
export const DURATION_WARN_SECONDS = 75

// 结构骨架模板
export const STRUCTURE_TEMPLATE = `【钩子（前3秒）】

【事件】

【内心实况】

【方法】

【结尾互动提问】
`

// 人设红线（写稿侧栏常驻）
export const PERSONA_REDLINES = [
  '不提具体平台名（抖音、小红书等一律不说）',
  '不承诺任何收益，不出现「赚钱 / 翻身 / 回本」类表述',
  '内置禁词与自定义禁词一律不用',
  '不点名、不贬低任何具体的人',
  '只讲自己的真实经历，不编造、不夸大',
]
