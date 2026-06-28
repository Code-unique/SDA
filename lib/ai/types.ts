// lib/ai/types.ts
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  tags: string[]
}

export interface UserProfile {
  id: string
  preferences: {
    fashionStyle: string[]
    skillLevel: 'beginner' | 'intermediate' | 'expert'
    interests: string[]
    goals: string[]
  }
  history: {
    topicsDiscussed: string[]
    feedbackGiven: string[]
    imagesAnalyzed: number
  }
}

export interface FashionInsight {
  category: string
  insight: string
  confidence: number
  sources: string[]
  timestamp: Date
}

export interface AnalysisResult {
  intent: string
  entities: Entity[]
  sentiment: 'positive' | 'negative' | 'neutral'
  confidence: number
  suggestions: string[]
}

export interface Entity {
  type: 'material' | 'color' | 'style' | 'technique' | 'brand' | 'trend'
  value: string
  confidence: number
}