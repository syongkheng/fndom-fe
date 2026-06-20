<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useMarketplaceStore } from '@/stores/marketplace'

const store = useMarketplaceStore()

const inputText = ref('')
const messagesEl = ref<HTMLElement | null>(null)

const messages = computed(() => store.currentMessages())
const svc = computed(() => store.selectedModel)

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function scrollToBottom() {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

watch(() => messages.value.length, scrollToBottom)
watch(() => store.isTyping, scrollToBottom)

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || store.isTyping || !svc.value) return
  inputText.value = ''
  await store.sendMessage(text)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

async function handleClear() {
  if (!svc.value) return
  try {
    await ElMessageBox.confirm(
      `Clear all messages for ${svc.value.name}?`,
      'Clear chat',
      { confirmButtonText: 'Clear', cancelButtonText: 'Cancel', type: 'warning' },
    )
    store.clearChat(svc.value.id)
  } catch {
    // cancelled
  }
}
</script>

<template>
  <div class="chat-panel">

    <!-- Empty state — absolutely centred, no flex fight -->
    <div v-if="!svc" class="chat-empty">
      <div class="empty-content">
        <div class="empty-eyebrow">Marketplace</div>
        <h2 class="empty-heading">What would you like<br>to do today?</h2>
        <p class="empty-sub">Choose a service from the sidebar to begin.</p>

        <div class="quick-list">
          <button
            v-for="s in store.models.slice(0, 4)"
            :key="s.id"
            class="quick-item"
            @click="store.setModel(s.id)"
          >
            <span class="quick-label">{{ s.name }}</span>
            <span class="quick-cost">{{ s.inputPrice }} / MTok</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Active chat -->
    <template v-else>

      <!-- Header -->
      <div class="chat-header">
        <div class="header-inner">
          <span class="header-icon">{{ svc.provider[0] }}</span>
          <div class="header-info">
            <div class="header-title">{{ svc.name }}</div>
            <span class="header-cost">{{ svc.inputPrice }} / MTok</span>
          </div>
          <el-button
            :icon="Delete"
            size="small"
            text
            type="danger"
            class="clear-btn"
            title="Clear"
            @click="handleClear"
          />
        </div>
      </div>

      <!-- Messages -->
      <div ref="messagesEl" class="messages-area">
        <div class="messages-inner">

          <div v-if="messages.length === 0 && !store.isTyping" class="messages-empty">
            Start a conversation with {{ svc.name }}.
          </div>

          <div
            v-for="msg in messages"
            :key="msg.id"
            class="message-row"
            :class="msg.role === 'user' ? 'message-row--user' : 'message-row--assistant'"
          >
            <div v-if="msg.role === 'assistant'" class="avatar">{{ svc.provider[0] }}</div>

            <div class="bubble-wrap">
              <div class="bubble" :class="msg.role === 'user' ? 'bubble--user' : 'bubble--assistant'">
                {{ msg.content }}
              </div>
              <div class="bubble-time">{{ formatTime(msg.timestamp) }}</div>
            </div>
          </div>

          <!-- Typing indicator -->
          <div v-if="store.isTyping" class="message-row message-row--assistant">
            <div class="avatar">{{ svc.provider[0] }}</div>
            <div class="bubble-wrap">
              <div class="bubble bubble--assistant typing-bubble">
                <span class="dot" />
                <span class="dot" />
                <span class="dot" />
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Composer -->
      <div class="composer">
        <div class="composer-inner">
          <el-input
            v-model="inputText"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 5 }"
            placeholder="Message..."
            resize="none"
            :disabled="store.isTyping"
            class="composer-input"
            @keydown="handleKeydown"
          />
          <div class="composer-footer">
            <span class="composer-hint">↵ send &nbsp;·&nbsp; ⇧↵ newline</span>
            <el-button
              type="primary"
              size="small"
              :disabled="!inputText.trim() || store.isTyping"
              class="send-btn"
              @click="handleSend"
            >
              Send
            </el-button>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<style scoped>
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  background: var(--color-background);
  min-width: 0;
}

/* ── Empty state ─────────────────────────────────────── */
.chat-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  pointer-events: none;
}

.empty-content {
  max-width: 420px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: all;
}

.empty-eyebrow {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--el-color-primary);
  opacity: 0.7;
}

.empty-heading {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-heading);
  line-height: 1.25;
  letter-spacing: -0.3px;
  margin: 0;
}

.empty-sub {
  font-size: 0.875rem;
  color: var(--color-text);
  opacity: 0.45;
  margin: 0;
  line-height: 1.55;
}

.quick-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 20px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-background-soft);
}

.quick-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
  width: 100%;
}

.quick-item:last-child {
  border-bottom: none;
}

.quick-item:hover {
  background: var(--color-background-mute);
}

.quick-icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.quick-label {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-heading);
}

.quick-cost {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.4;
}

.quick-cost--free {
  color: var(--el-color-success);
  opacity: 0.75;
  font-weight: 600;
}

/* ── Header ──────────────────────────────────────────── */
.chat-header {
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border);
  padding: 0 24px;
}

.header-inner {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 0;
}

.header-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.header-info {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.header-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--color-heading);
}

.header-cost {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.4;
}

.header-cost--free {
  color: var(--el-color-success);
  opacity: 0.7;
}

.clear-btn {
  flex-shrink: 0;
  opacity: 0.4;
  transition: opacity 0.15s;
}
.clear-btn:hover { opacity: 1; }

/* ── Messages ────────────────────────────────────────── */
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

.messages-empty {
  text-align: center;
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.3;
  padding-top: 60px;
}

.message-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.message-row--user { flex-direction: row-reverse; }

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.bubble-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 60%;
}

.message-row--user .bubble-wrap { align-items: flex-end; }

.bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 0.875rem;
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

.bubble-time {
  font-size: 0.62rem;
  color: var(--color-text);
  opacity: 0.28;
  padding: 0 4px;
}

/* Typing dots */
.typing-bubble {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 11px 16px;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-text);
  opacity: 0.35;
  animation: dot-bounce 1.1s infinite ease-in-out;
}
.dot:nth-child(2) { animation-delay: 0.18s; }
.dot:nth-child(3) { animation-delay: 0.36s; }

@keyframes dot-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
  30% { transform: translateY(-4px); opacity: 0.7; }
}

/* ── Composer ────────────────────────────────────────── */
.composer {
  flex-shrink: 0;
  padding: 14px 24px 18px;
  border-top: 1px solid var(--color-border);
}

.composer-inner {
  max-width: 720px;
  margin: 0 auto;
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background-soft);
  padding: 10px 12px 8px;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.composer-inner:focus-within {
  border-color: var(--el-color-primary-light-3);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--el-color-primary) 7%, transparent);
}

.composer-input :deep(.el-textarea__inner) {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
  font-size: 0.875rem;
  line-height: 1.55;
  resize: none;
  color: var(--color-text);
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

/* ── Mobile ──────────────────────────────────────────── */
@media (max-width: 768px) {
  .chat-header,
  .messages-area,
  .composer { padding-left: 16px; padding-right: 16px; }

  .bubble-wrap { max-width: 80%; }

  .composer-hint { display: none; }

  .empty-heading { font-size: 1.4rem; }
}
</style>
