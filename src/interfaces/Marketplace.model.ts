export interface LLMModel {
  id: string            // frontend key — same as modelId for most models
  name: string
  modelId: string       // API model ID (e.g. 'claude-sonnet-4-6')
  provider: string
  providerColor: string
  description: string
  contextWindow: string
  maxOutput: string
  inputPrice: string
  outputPrice: string
  badge?: string | null
  tags: string[]
  inputCentsPerK?: number   // billing rate from admin config
  outputCentsPerK?: number
}

export interface ModelConfigAdmin extends LLMModel {
  isActive: boolean
  sortOrder: number
  createdAt: number
  updatedAt: number | null
  createdBy: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface WalletDto {
  balance: number
  currency: string
  updatedAt: number | null
}

export interface ApiKeyDto {
  apiKey: string
  label: string
  createdAt: number
}

export interface SessionDto {
  sessionId: string
  modelId: string
  title: string
  createdAt: number
  updatedAt: number | null
}

export interface TopupDto {
  id: number
  amountCents: number
  paymentMethod: string
  createdAt: number
}
