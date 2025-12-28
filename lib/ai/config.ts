// lib/ai/config.ts
export interface AIConfig {
  model: {
    name: string
    provider: 'local' | 'huggingface'
    url: string
    maxTokens: number
  }
  memory: {
    maxConversations: number
    vectorStoreSize: number
    summaryInterval: number
  }
  features: {
    enableImageAnalysis: boolean
    enableLearning: boolean
    enableTrendAnalysis: boolean
  }
}

export const config: AIConfig = {
  model: {
    name: 'google/flan-t5-small',
    provider: 'local',
    url: 'https://huggingface.co/google/flan-t5-small',
    maxTokens: 500
  },
  memory: {
    maxConversations: 50,
    vectorStoreSize: 1000,
    summaryInterval: 10
  },
  features: {
    enableImageAnalysis: true,
    enableLearning: true,
    enableTrendAnalysis: true
  }
}