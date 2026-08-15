export interface TopicDTO {
  id: number
  title: string
  hook: string
  category: string
  status: string
  createdAt: string
}

export interface ContentDTO {
  id: number
  topicId: number
  body: string
  wordCount: number
  durationEst: number
  status: string
  plannedDate: string | null
  publishedDate: string | null
  createdAt: string
  updatedAt: string
  topic?: TopicDTO
}

export interface SettingsDTO {
  customBannedWords: string[]
}

export interface MetricDTO {
  id: number
  contentId: number
  platform: string
  date: string
  views: number
  completion3s: number | null
  completionFull: number | null
  likes: number
  comments: number
  saves: number
  shares: number
  newFans: number
  iterationNote: string
  createdAt: string
  content: {
    id: number
    topic: { id: number; title: string; category: string; status: string }
  }
}
