import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LLMModel, ChatMessage, WalletDto, ApiKeyDto, SessionDto } from '@/interfaces/Marketplace.model'
import HttpClient, { setActiveApiKey } from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'

export const LLM_MODELS: LLMModel[] = [
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4',
    modelId: 'claude-sonnet-4-6',
    provider: 'Anthropic',
    providerColor: '#C84B31',
    description:
      'The recommended model for most tasks. Excellent at coding, analysis and nuanced reasoning with a strong balance of speed and capability.',
    contextWindow: '200K',
    maxOutput: '64K',
    inputPrice: '$3.00',
    outputPrice: '$15.00',
    badge: 'Popular',
    tags: ['Coding', 'Analysis', 'Reasoning'],
  },
  {
    id: 'claude-opus-4-8',
    name: 'Claude Opus 4',
    modelId: 'claude-opus-4-8',
    provider: 'Anthropic',
    providerColor: '#C84B31',
    description:
      "Anthropic's most intelligent model. Handles the most complex tasks with superior reasoning, nuanced understanding and extended thinking.",
    contextWindow: '200K',
    maxOutput: '32K',
    inputPrice: '$15.00',
    outputPrice: '$75.00',
    tags: ['Complex Tasks', 'Reasoning', 'Research'],
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4',
    modelId: 'claude-haiku-4-5-20251001',
    provider: 'Anthropic',
    providerColor: '#C84B31',
    description:
      "Anthropic's fastest model. Built for near-instant responses, lightweight classification, and high-throughput production workloads.",
    contextWindow: '200K',
    maxOutput: '16K',
    inputPrice: '$0.80',
    outputPrice: '$4.00',
    badge: 'Fastest',
    tags: ['Fast', 'Lightweight', 'High Volume'],
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    modelId: 'gpt-4o',
    provider: 'OpenAI',
    providerColor: '#10a37f',
    description:
      "OpenAI's flagship multimodal model. Strong across text, vision and audio understanding with broad general intelligence.",
    contextWindow: '128K',
    maxOutput: '16K',
    inputPrice: '$2.50',
    outputPrice: '$10.00',
    tags: ['Multimodal', 'Vision', 'General'],
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    modelId: 'gpt-4o-mini',
    provider: 'OpenAI',
    providerColor: '#10a37f',
    description:
      'Small and affordable. Designed for fast, focused tasks — extraction, classification, summarisation and structured outputs.',
    contextWindow: '128K',
    maxOutput: '16K',
    inputPrice: '$0.15',
    outputPrice: '$0.60',
    badge: 'Best Value',
    tags: ['Affordable', 'Summarisation', 'Structured'],
  },
  {
    id: 'gemini-2-flash',
    name: 'Gemini 2.0 Flash',
    modelId: 'gemini-2.0-flash',
    provider: 'Google',
    providerColor: '#4285F4',
    description:
      "Google's next-generation multimodal model. Exceptional speed with native audio, image and video understanding built in.",
    contextWindow: '1M',
    maxOutput: '8K',
    inputPrice: '$0.10',
    outputPrice: '$0.40',
    badge: 'New',
    tags: ['Multimodal', 'Long Context', 'Fast'],
  },
  {
    id: 'gemini-1-5-pro',
    name: 'Gemini 1.5 Pro',
    modelId: 'gemini-1.5-pro',
    provider: 'Google',
    providerColor: '#4285F4',
    description:
      "Google's long-context specialist. Handles up to 2 million tokens — ideal for entire codebases, books and large datasets.",
    contextWindow: '2M',
    maxOutput: '8K',
    inputPrice: '$1.25',
    outputPrice: '$5.00',
    tags: ['Long Context', 'Documents', 'Analysis'],
  },
  {
    id: 'llama-3-3-70b',
    name: 'Llama 3.3 70B',
    modelId: 'llama-3.3-70b-instruct',
    provider: 'Meta',
    providerColor: '#0082FB',
    description:
      "Meta's open-source powerhouse. Competitive performance with full transparency — run via API or on your own infrastructure.",
    contextWindow: '128K',
    maxOutput: '8K',
    inputPrice: '$0.59',
    outputPrice: '$0.79',
    tags: ['Open Source', 'Self-hostable', 'Flexible'],
  },
]

function makeId() {
  return Math.random().toString(36).slice(2)
}

export const useMarketplaceStore = defineStore('marketplace', () => {
  const models        = ref<LLMModel[]>(LLM_MODELS)  // fallback until fetchModels() resolves
  const modelsLoaded  = ref(false)
  const selectedModel = ref<LLMModel | null>(null)
  const chatHistory   = ref<Record<string, ChatMessage[]>>({})
  const isTyping      = ref(false)
  const chatError     = ref<string | null>(null)

  // sessionIdMap: modelId (LLMModel.id) → backend session UUID
  const sessionIdMap  = ref<Record<string, string>>({})

  // messageCostMap: messageId → costCents (for display in chat)
  const messageCostMap     = ref<Record<string, number>>({})
  // messageTokenMap: messageId → { in, out } token counts
  const messageTokenMap    = ref<Record<string, { in: number; out: number }>>({})
  // messageDurationMap: messageId → actual API response time in ms
  const messageDurationMap = ref<Record<string, number>>({})
  // triggers fulfilled toast in ChatView; cleared after consumption
  const lastFulfilledDuration = ref<number | null>(null)

  const wallet             = ref<WalletDto | null>(null)
  const apiKey             = ref<ApiKeyDto | null>(null)
  const trialApiKey        = ref<string | null>(null)
  const isTrialMode        = ref(false)
  const sessions           = ref<SessionDto[]>([])
  const streamingMessageId = ref<string | null>(null)

  function setModel(modelId: string): boolean {
    const found = models.value.find(m => m.id === modelId)
    if (!found) return false
    selectedModel.value = found
    if (!chatHistory.value[found.id]) chatHistory.value[found.id] = []
    return true
  }

  function currentMessages(): ChatMessage[] {
    if (!selectedModel.value) return []
    return chatHistory.value[selectedModel.value.id] ?? []
  }

  async function sendMessage(content: string) {
    const model = selectedModel.value
    if (!model || !content.trim()) return

    if (!chatHistory.value[model.id]) chatHistory.value[model.id] = []
    chatError.value = null

    const userMsgId   = makeId()
    const trimmed     = content.trim()
    const estTokensIn = Math.floor(trimmed.length / 4)
    chatHistory.value[model.id].push({
      id:        userMsgId,
      role:      'user',
      content:   trimmed,
      timestamp: Date.now(),
    })
    if (estTokensIn > 0) messageTokenMap.value[userMsgId] = { in: estTokensIn, out: 0 }

    const isNewSession = !sessionIdMap.value[model.id]

    const PIPELINE_MS = 1100  // min display time for the journey animation
    isTyping.value = true

    try {
      const body = {
        sessionId: sessionIdMap.value[model.id] ?? null,
        modelId:   model.modelId,
        message:   trimmed,
      }
      const endpoint = isTrialMode.value ? ApiRoute.MARKETPLACE.TRIAL_CHAT : ApiRoute.MARKETPLACE.CHAT
      const t0  = Date.now()
      const res = await HttpClient.post(endpoint, body)
      const { sessionId, reply, costCents, tokensIn, tokensOut, inputCostCents, outputCostCents } = res.data.data as { sessionId: string; reply: string; costCents: number; tokensIn: number; tokensOut: number; inputCostCents: number; outputCostCents: number }

      // Measure actual API response time BEFORE the artificial pipeline delay
      const elapsed = Date.now() - t0
      const msgId   = makeId()

      messageDurationMap.value[msgId] = elapsed
      lastFulfilledDuration.value     = elapsed   // triggers toast in ChatView

      // Reconcile user bubble with server-confirmed token count and input cost
      if (tokensIn > 0)       messageTokenMap.value[userMsgId] = { in: tokensIn, out: 0 }
      if (inputCostCents > 0) messageCostMap.value[userMsgId]  = inputCostCents
      if (tokensOut > 0)       messageTokenMap.value[msgId]    = { in: 0, out: tokensOut }
      if (outputCostCents > 0) messageCostMap.value[msgId]     = outputCostCents
      void costCents // used only for wallet deduction on the server

      // Hold the pipeline visible until the animation completes (no-op for slow real LLMs)
      if (elapsed < PIPELINE_MS) {
        await new Promise(r => setTimeout(r, PIPELINE_MS - elapsed))
      }

      sessionIdMap.value[model.id] = sessionId
      isTyping.value = false

      if (isNewSession) {
        sessions.value.unshift({
          sessionId,
          modelId:   model.modelId,
          title:     `Chat with ${model.name}`,
          createdAt: Date.now(),
          updatedAt: null,
        })
      }

      // Refresh wallet balance after deduction
      fetchWallet()
      chatHistory.value[model.id].push({
        id:        msgId,
        role:      'assistant',
        content:   '',
        timestamp: Date.now(),
      })
      streamingMessageId.value = msgId

      const modelId = model.id
      let   i       = 0
      const CHUNK   = 3
      const TICK    = 18
      const interval = setInterval(() => {
        const end = Math.min(i + CHUNK, reply.length)
        // Look up by ID each tick — avoids stale-index issues on reactive arrays
        const msg = chatHistory.value[modelId]?.find(m => m.id === msgId)
        if (msg) msg.content = reply.slice(0, end)
        i = end
        if (i >= reply.length) {
          clearInterval(interval)
          streamingMessageId.value = null
        }
      }, TICK)
    } catch {
      isTyping.value = false
      chatHistory.value[model.id].push({
        id:        makeId(),
        role:      'assistant',
        content:   'Unable to reach the server. Please check your connection and try again.',
        timestamp: Date.now(),
      })
      chatError.value = 'Request failed'
    }
  }

  function clearChat(modelId: string) {
    chatHistory.value[modelId] = []
    delete sessionIdMap.value[modelId]
  }

  // ── Models ────────────────────────────────────────────────

  async function fetchModels() {
    try {
      const res = await HttpClient.get(ApiRoute.MARKETPLACE.MODELS)
      const raw = res.data.data.models as Array<{
        modelId: string; displayName: string; provider: string; providerColor: string
        inputPriceUsdMtok: number; outputPriceUsdMtok: number
        contextWindow: string; maxOutputTokens: string
        badge: string | null; tags: string[]
      }>
      models.value = raw.map(m => ({
        id:              m.modelId,
        name:            m.displayName,
        modelId:         m.modelId,
        provider:        m.provider,
        providerColor:   m.providerColor,
        description:     '',   // description not stored in DB — kept in i18n keys
        contextWindow:   m.contextWindow,
        maxOutput:       m.maxOutputTokens,
        inputPrice:      `$${Number(m.inputPriceUsdMtok).toFixed(2)}`,
        outputPrice:     `$${Number(m.outputPriceUsdMtok).toFixed(2)}`,
        badge:           m.badge ?? undefined,
        tags:            m.tags,
        inputCentsPerK:  undefined,
        outputCentsPerK: undefined,
      }))
      modelsLoaded.value = true
    } catch {
      // Keep fallback LLM_MODELS on error
      modelsLoaded.value = true
    }
  }

  // ── Wallet ────────────────────────────────────────────────

  async function fetchWallet() {
    try {
      const res = await HttpClient.get(ApiRoute.MARKETPLACE.WALLET)
      wallet.value = res.data.data.wallet as WalletDto
    } catch {
      // Silently ignore — balance stays null until next successful fetch
    }
  }

  async function topUp(amountCents: number, paymentMethod: string) {
    const res = await HttpClient.post(ApiRoute.MARKETPLACE.TOPUP, { amountCents, paymentMethod })
    wallet.value = res.data.data.wallet as WalletDto
  }

  // ── API Key ───────────────────────────────────────────────

  async function fetchApiKey() {
    try {
      const res = await HttpClient.get(ApiRoute.MARKETPLACE.API_KEY)
      apiKey.value = res.data.data.apiKey as ApiKeyDto
      setActiveApiKey(apiKey.value.apiKey)
      isTrialMode.value = false
    } catch {
      // Silently ignore
    }
  }

  async function fetchTrialKey() {
    try {
      const res = await HttpClient.get(ApiRoute.MARKETPLACE.TRIAL_KEY)
      trialApiKey.value = res.data.data.apiKey as string | null
      if (!apiKey.value) {
        setActiveApiKey(trialApiKey.value)
        isTrialMode.value = !!trialApiKey.value
      }
    } catch {
      // Silently ignore
    }
  }

  async function rotateApiKey() {
    const res = await HttpClient.post(ApiRoute.MARKETPLACE.ROTATE_API_KEY, {})
    apiKey.value = res.data.data.apiKey as ApiKeyDto
    setActiveApiKey(apiKey.value.apiKey)
    isTrialMode.value = false
  }

  // ── Sessions ──────────────────────────────────────────────

  async function fetchSessions() {
    try {
      const res = await HttpClient.get(ApiRoute.MARKETPLACE.SESSIONS)
      sessions.value = res.data.data.sessions as SessionDto[]
    } catch {
      // Silently ignore
    }
  }

  async function deleteSession(sessionId: string) {
    await HttpClient.post(ApiRoute.MARKETPLACE.DELETE_SESSION(sessionId), {})
    sessions.value = sessions.value.filter(s => s.sessionId !== sessionId)
    const entry = Object.entries(sessionIdMap.value).find(([, v]) => v === sessionId)
    if (entry) {
      const modelId = entry[0]
      const msgIds  = (chatHistory.value[modelId] ?? []).map(m => m.id)
      msgIds.forEach(id => {
        delete messageTokenMap.value[id]
        delete messageCostMap.value[id]
        delete messageDurationMap.value[id]
      })
      delete sessionIdMap.value[modelId]
      chatHistory.value[modelId] = []
    }
  }

  // Load a historical session into the active chat state
  async function loadSession(session: SessionDto): Promise<LLMModel | null> {
    // session.modelId is the API model ID (e.g. 'claude-sonnet-4-6')
    const model = models.value.find(m => m.modelId === session.modelId)
    if (!model) return null

    selectedModel.value = model
    try {
      const res = await HttpClient.get(ApiRoute.MARKETPLACE.SESSION_MESSAGES(session.sessionId))
      const msgs = res.data.data.messages as Array<{ id: string; role: string; content: string; createdAt: number }>
      chatHistory.value[model.id] = msgs.map(m => ({
        id:        m.id,
        role:      m.role as 'user' | 'assistant',
        content:   m.content,
        timestamp: m.createdAt,
      }))
      sessionIdMap.value[model.id] = session.sessionId
    } catch {
      chatHistory.value[model.id] = []
    }
    return model
  }

  function clearLastFulfilledDuration() {
    lastFulfilledDuration.value = null
  }

  return {
    models,
    modelsLoaded,
    selectedModel,
    chatHistory,
    isTyping,
    chatError,
    sessionIdMap,
    streamingMessageId,
    messageCostMap,
    messageTokenMap,
    messageDurationMap,
    lastFulfilledDuration,
    clearLastFulfilledDuration,
    wallet,
    apiKey,
    trialApiKey,
    isTrialMode,
    sessions,
    setModel,
    currentMessages,
    sendMessage,
    clearChat,
    fetchModels,
    fetchWallet,
    topUp,
    fetchApiKey,
    fetchTrialKey,
    rotateApiKey,
    fetchSessions,
    deleteSession,
    loadSession,
  }
})
