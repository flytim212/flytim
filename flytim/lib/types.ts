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
