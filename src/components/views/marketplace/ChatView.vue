<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useMarketplaceStore } from '@/stores/marketplace'
import type { SessionDto } from '@/interfaces/Marketplace.model'
import MessagePipeline from './MessagePipeline.vue'

const route  = useRoute()
const router = useRouter()
const store  = useMarketplaceStore()
const { t }  = useI18n()

const inputText     = ref('')
const messagesEl    = ref<HTMLElement | null>(null)
const showHistory   = ref(true)
const historyLoading = ref(false)

const model    = computed(() => store.selectedModel)
const messages = computed(() => store.currentMessages())
const isBusy   = computed(() => store.isTyping || !!store.streamingMessageId)

// ── Markdown ──────────────────────────────────────────────
marked.use({ async: false, breaks: true })

function renderMarkdown(text: string): string {
  const html = marked.parse(text) as string
  return DOMPurify.sanitize(html)
}

// ── Boot ──────────────────────────────────────────────────
onMounted(async () => {
  const id = route.query.model as string | undefined
  if (!id || !store.setModel(id)) {
    router.replace('/llm')
    return
  }
  historyLoading.value = true
  await store.fetchSessions()
  historyLoading.value = false
})

// ── Scroll ────────────────────────────────────────────────
async function scrollToBottom() {
  await nextTick()
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}
watch(() => messages.value.length, scrollToBottom)
watch(() => store.isTyping, scrollToBottom)

// ── Send ──────────────────────────────────────────────────
async function handleSend() {
  const text = inputText.value.trim()
  if (!text || isBusy.value || !model.value) return
  inputText.value = ''
  await store.sendMessage(text)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

// ── Clear ─────────────────────────────────────────────────
async function handleClear() {
  if (!model.value) return
  try {
    await ElMessageBox.confirm(
      t('marketplace.chatPage.clearConfirm'),
      t('marketplace.chatPage.clear'),
      { confirmButtonText: t('marketplace.chatPage.clear'), cancelButtonText: t('marketplace.chatPage.cancel'), type: 'warning' },
    )
    store.clearChat(model.value.id)
  } catch { /* cancelled */ }
}

// ── History panel ─────────────────────────────────────────
async function toggleHistory() {
  showHistory.value = !showHistory.value
  if (showHistory.value && store.sessions.length === 0) {
    historyLoading.value = true
    await store.fetchSessions()
    historyLoading.value = false
  }
}

async function handleSelectSession(session: SessionDto) {
  const loadedModel = await store.loadSession(session)
  if (loadedModel) {
    router.replace({ query: { model: loadedModel.id } })
    showHistory.value = false
    await nextTick()
    scrollToBottom()
  }
}

async function handleDeleteSession(session: SessionDto, e: Event) {
  e.stopPropagation()
  try {
    await ElMessageBox.confirm(
      'This will permanently delete this conversation.',
      'Delete Session',
      { confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'warning' },
    )
    await store.deleteSession(session.sessionId)
    ElMessage.success(t('toast.chatSessionDeleted'))
  } catch { /* cancelled */ }
}

function handleNewChat() {
  if (model.value) {
    store.clearChat(model.value.id)
  }
  showHistory.value = false
}

// ── Formatting ────────────────────────────────────────────
function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatSessionDate(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

async function copyMessage(content: string) {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success(t('toast.chatCopied'))
  } catch {
    ElMessage.error(t('toast.chatCopyFailed'))
  }
}

// Show "Request fulfilled" toast when a response arrives
watch(() => store.lastFulfilledDuration, (ms) => {
  if (ms === null) return
  ElMessage({
    message:  t('toast.chatFulfilled', { ms }),
    type:     'success',
    duration: 2500,
    offset:   60,
  })
  store.clearLastFulfilledDuration()
})
</script>

<template>
  <div class="chat-page" :style="model ? { '--accent': model.providerColor } : {}">

    <!-- ── Header ─────────────────────────────────────────── -->
    <header class="chat-header">
      <el-button text size="small" class="header-btn" @click="router.push('/llm')">
        {{ t('marketplace.chatPage.back') }}
      </el-button>

      <!-- History toggle -->
      <el-button
        text
        size="small"
        class="header-btn history-btn"
        :class="{ 'history-btn--active': showHistory }"
        title="Conversation history"
        @click="toggleHistory"
      >
        ☰
      </el-button>

      <!-- Model label (Fix 3: replaced broken dropdown with static display) -->
      <div class="model-label" v-if="model">
        <span class="model-label-dot" :style="{ background: model.providerColor }" />
        <span class="model-label-name">{{ model.name }}</span>
        <span class="model-label-provider">{{ model.provider }}</span>
      </div>

      <span v-if="store.isTrialMode" class="trial-badge">TRIAL</span>

      <div class="header-spacer" />

      <el-button
        :icon="Delete"
        text
        type="danger"
        size="small"
        class="header-btn clear-btn"
        :title="t('marketplace.chatPage.clear')"
        @click="handleClear"
      />
    </header>

    <!-- ── Body ──────────────────────────────────────────── -->
    <div class="chat-body">

      <!-- Sessions panel (Fix 1) -->
      <transition name="panel-slide">
        <aside v-if="showHistory" class="sessions-panel">
          <div class="sessions-header">
            <span class="sessions-title">History</span>
            <el-button type="primary" size="small" plain @click="handleNewChat">
              + New
            </el-button>
          </div>

          <div v-if="historyLoading" class="sessions-loading">
            <span>Loading…</span>
          </div>

          <div v-else-if="store.sessions.length === 0" class="sessions-empty">
            No saved conversations yet.
          </div>

          <ul v-else class="sessions-list">
            <li
              v-for="s in store.sessions"
              :key="s.sessionId"
              class="session-row"
              :class="{ 'session-row--active': store.sessionIdMap[store.selectedModel?.id ?? ''] === s.sessionId }"
              @click="handleSelectSession(s)"
            >
              <span
                class="session-dot"
                :style="{ background: store.models.find(m => m.modelId === s.modelId)?.providerColor ?? '#888' }"
              />
              <div class="session-info">
                <span class="session-title">{{ s.title }}</span>
                <span class="session-date">{{ formatSessionDate(s.updatedAt ?? s.createdAt) }}</span>
              </div>
              <button class="session-delete" title="Delete" @click="handleDeleteSession(s, $event)">
                ✕
              </button>
            </li>
          </ul>
        </aside>
      </transition>

      <!-- Main chat -->
      <div class="chat-main">

        <!-- Messages (Fix 2: markdown rendering) -->
        <div ref="messagesEl" class="messages-area">
          <div class="messages-inner">

            <div v-if="messages.length === 0 && !store.isTyping" class="msg-empty">
              <span class="msg-empty-icon" v-if="model">{{ model.provider[0] }}</span>
              <span>{{ t('marketplace.chatPage.empty') }}</span>
            </div>

            <div
              v-for="msg in messages"
              :key="msg.id"
              class="msg-row"
              :class="msg.role === 'user' ? 'msg-row--user' : 'msg-row--assistant'"
            >
              <div class="bubble-wrap">
                <!-- User bubble: plain text -->
                <div v-if="msg.role === 'user'" class="bubble bubble--user">
                  {{ msg.content }}
                </div>

                <!-- Assistant bubble: markdown (Fix 2) + streaming cursor via CSS (Fix 4) -->
                <div
                  v-else
                  class="bubble bubble--assistant"
                  :class="{ 'bubble--streaming': msg.id === store.streamingMessageId }"
                  v-html="renderMarkdown(msg.content)"
                />

                <div class="bubble-meta">
                  <span class="bubble-time">{{ formatTime(msg.timestamp) }}</span>
                  <span
                    v-if="msg.role === 'user' && store.messageTokenMap[msg.id]"
                    class="bubble-tokens"
                  >
                    {{ store.messageTokenMap[msg.id].in }} tok
                    <template v-if="store.messageCostMap[msg.id]">
                      · {{ formatCost(store.messageCostMap[msg.id]) }}
                    </template>
                  </span>
                  <span
                    v-if="msg.role === 'assistant' && store.messageTokenMap[msg.id]"
                    class="bubble-tokens"
                  >
                    {{ store.messageTokenMap[msg.id].out }} tok
                    <template v-if="store.messageCostMap[msg.id]">
                      · {{ formatCost(store.messageCostMap[msg.id]) }}
                    </template>
                    <template v-if="store.messageDurationMap[msg.id]">
                      · {{ store.messageDurationMap[msg.id] }}ms
                    </template>
                  </span>
                  <button
                    v-if="msg.role === 'assistant' && msg.id !== store.streamingMessageId"
                    class="copy-msg-btn"
                    title="Copy"
                    @click="copyMessage(msg.content)"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>


          </div>
        </div>

        <!-- Pipeline status bar — always visible above the composer while sending -->
        <Transition name="bar-fade">
          <div v-if="store.isTyping" class="pipeline-bar">
            <MessagePipeline
              :provider-color="model?.providerColor ?? '#888'"
              :provider-name="model?.provider ?? 'LLM'"
            />
          </div>
        </Transition>

        <!-- Composer (Fix 4: disabled while streaming) -->
        <div class="composer-wrap">
          <div class="composer">
            <el-input
              v-model="inputText"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 5 }"
              :placeholder="t('marketplace.chatPage.placeholder')"
              resize="none"
              :disabled="isBusy"
              class="composer-input"
              @keydown="handleKeydown"
            />
            <div class="composer-footer">
              <span class="composer-hint">{{ t('marketplace.chatPage.hint') }}</span>
              <el-button
                type="primary"
                size="small"
                :disabled="!inputText.trim() || isBusy"
                @click="handleSend"
              >{{ t('marketplace.chatPage.send') }}</el-button>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
.chat-page {
  width: 100%;
  height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-background);
}

/* ── Header ──────────────────────────────────────────────── */
.chat-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
  border-top: 3px solid var(--accent, var(--el-color-primary));
  min-height: 48px;
}

.header-btn {
  flex-shrink: 0;
  opacity: 0.55;
  font-size: 0.82rem;
  padding: 10px 4px;
  transition: opacity 0.15s;
}
.header-btn:hover { opacity: 1; }

.history-btn { font-size: 1rem; }
.history-btn--active { opacity: 1; color: var(--el-color-primary) !important; }

.model-label {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px;
  border-radius: 8px;
  background: var(--color-background-mute);
  flex-shrink: 0;
}

.model-label-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.model-label-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-heading);
}

.model-label-provider {
  font-size: 0.7rem;
  opacity: 0.4;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.trial-badge {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 2px 7px;
  border-radius: 4px;
  background: #f59e0b;
  color: #fff;
  flex-shrink: 0;
  user-select: none;
}

.header-spacer { flex: 1; }

.clear-btn { opacity: 0.4; }

/* ── Body ────────────────────────────────────────────────── */
.chat-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Sessions panel ──────────────────────────────────────── */
.sessions-panel {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border);
  background: var(--color-background-soft);
  overflow: hidden;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: width 0.2s ease, opacity 0.2s ease;
  overflow: hidden;
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  width: 0;
  opacity: 0;
}
.panel-slide-enter-to,
.panel-slide-leave-from {
  width: 240px;
  opacity: 1;
}

.sessions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.sessions-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--color-text);
  opacity: 0.45;
}

.sessions-loading,
.sessions-empty {
  padding: 24px 14px;
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.35;
  text-align: center;
}

.sessions-list {
  list-style: none;
  margin: 0;
  padding: 6px 0;
  overflow-y: auto;
  flex: 1;
}

.session-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  cursor: pointer;
  border-radius: 8px;
  margin: 0 6px;
  transition: background 0.12s;
  position: relative;
}

.session-row:hover { background: var(--color-background-mute); }
.session-row--active { background: color-mix(in srgb, var(--el-color-primary) 8%, transparent); }

.session-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-date {
  font-size: 0.65rem;
  color: var(--color-text);
  opacity: 0.35;
}

.session-delete {
  display: none;
  flex-shrink: 0;
  border: none;
  background: none;
  font-size: 0.65rem;
  color: var(--color-text);
  opacity: 0.4;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: opacity 0.12s, background 0.12s;
}

.session-row:hover .session-delete { display: block; }
.session-delete:hover { opacity: 1; background: var(--color-background-soft); }

/* ── Chat main ───────────────────────────────────────────── */
.chat-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

/* ── Messages ────────────────────────────────────────────── */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px;
}

.messages-inner {
  max-width: 720px;
  margin: 0 auto;
  padding: 28px 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.msg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 80px 0 40px;
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.3;
}

.msg-empty-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent, var(--el-color-primary));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
  opacity: 0.5;
}

.msg-row {
  display: flex;
  align-items: flex-end;
}
.msg-row--user      { justify-content: flex-end; }
.msg-row--assistant { justify-content: flex-start; }

.bubble-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 72%;
}
.msg-row--user .bubble-wrap { align-items: flex-end; }

.bubble {
  padding: 11px 15px;
  border-radius: 16px;
  font-size: 0.9rem;
  line-height: 1.55;
  word-break: break-word;
}

.bubble--user {
  background: var(--el-color-primary);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.bubble--assistant {
  background: var(--color-background-soft);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-bottom-left-radius: 4px;
}

/* Streaming cursor via ::after (Fix 4) */
.bubble--streaming::after {
  content: '';
  display: inline-block;
  width: 2px;
  height: 0.85em;
  background: currentColor;
  margin-left: 2px;
  vertical-align: text-bottom;
  opacity: 0.6;
  animation: blink 0.75s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

/* Markdown content inside assistant bubbles */
.bubble--assistant :deep(p)          { margin: 0 0 0.6em; }
.bubble--assistant :deep(p:last-child) { margin-bottom: 0; }
.bubble--assistant :deep(ul),
.bubble--assistant :deep(ol)         { margin: 0.4em 0; padding-left: 1.4em; }
.bubble--assistant :deep(li)         { margin-bottom: 0.2em; }
.bubble--assistant :deep(code)       {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.82em;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1px 5px;
}
.bubble--assistant :deep(pre) {
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 14px;
  overflow-x: auto;
  margin: 0.5em 0;
}
.bubble--assistant :deep(pre code) {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.82em;
  line-height: 1.6;
}
.bubble--assistant :deep(h1),
.bubble--assistant :deep(h2),
.bubble--assistant :deep(h3) {
  font-weight: 700;
  margin: 0.6em 0 0.3em;
  line-height: 1.3;
}
.bubble--assistant :deep(blockquote) {
  border-left: 3px solid var(--color-border);
  margin: 0.5em 0;
  padding: 4px 12px;
  opacity: 0.7;
}
.bubble--assistant :deep(strong) { font-weight: 700; }
.bubble--assistant :deep(em)     { font-style: italic; }
.bubble--assistant :deep(a)      { color: var(--el-color-primary); text-decoration: underline; }

/* Bubble meta row (time + copy) */
.bubble-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
}

.bubble-time {
  font-size: 0.62rem;
  color: var(--color-text);
  opacity: 0.28;
}

.bubble-tokens {
  font-size: 0.6rem;
  color: var(--color-text);
  opacity: 0.3;
  font-variant-numeric: tabular-nums;
}

.copy-msg-btn {
  border: none;
  background: none;
  font-size: 0.62rem;
  color: var(--color-text);
  opacity: 0;
  cursor: pointer;
  padding: 1px 5px;
  border-radius: 4px;
  transition: opacity 0.15s, background 0.15s;
}
.msg-row:hover .copy-msg-btn { opacity: 0.4; }
.copy-msg-btn:hover           { opacity: 1; background: var(--color-background-mute); }


/* ── Pipeline status bar ─────────────────────────────────── */
.pipeline-bar {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding: 10px 24px;
  border-top: 1px solid var(--color-border);
  background: var(--color-background-soft);
}

.bar-fade-enter-active,
.bar-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
  overflow: hidden;
}
.bar-fade-enter-from,
.bar-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

/* ── Composer ────────────────────────────────────────────── */
.composer-wrap {
  flex-shrink: 0;
  padding: 14px 24px 20px;
  border-top: 1px solid var(--color-border);
}

.composer {
  max-width: 720px;
  margin: 0 auto;
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background-soft);
  padding: 10px 12px 8px;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.composer:focus-within {
  border-color: var(--el-color-primary-light-3);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--el-color-primary) 7%, transparent);
}

.composer-input :deep(.el-textarea__inner) {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
  font-size: 0.9rem;
  line-height: 1.55;
  resize: none;
}
.composer-input :deep(.el-textarea__inner:focus) { box-shadow: none; }

.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.composer-hint {
  font-size: 0.65rem;
  color: var(--color-text);
  opacity: 0.25;
  user-select: none;
}

/* ── Mobile ──────────────────────────────────────────────── */
@media (max-width: 768px) {
  .sessions-panel  { width: 200px; }

  .panel-slide-enter-to,
  .panel-slide-leave-from { width: 200px; }

  .messages-area   { padding: 0 16px; }
  .composer-wrap   { padding: 12px 16px 16px; }
  .bubble-wrap     { max-width: 88%; }
  .composer-hint   { display: none; }
  .model-label-provider { display: none; }
}
</style>
