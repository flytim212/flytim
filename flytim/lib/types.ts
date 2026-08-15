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

// 知识库
export interface SourceDTO {
  id: number
  type: string
  title: string
  author: string
  url: string
  description: string
  status: string
  tags: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface CardDTO {
  id: number
  title: string
  oneLiner: string
  source: string
  keyPoints: string
  myExperience: string
  scriptDraft: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface NoteDTO {
  id: number
  course: string
  episode: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface CaseDTO {
  id: number
  date: string
  trigger: string
  emotionType: string
  bodySignal: string
  action: string
  result: string
  usableAsTopic: boolean
  createdAt: string
}

export interface QuoteDTO {
  id: number
  text: string
  source: string
  createdAt: string
}
