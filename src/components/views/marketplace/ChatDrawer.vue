<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useMarketplaceStore } from '@/stores/marketplace'

const store = useMarketplaceStore()
const { t } = useI18n()

const drawerVisible = ref(false)
const inputText = ref('')
const messagesEl = ref<HTMLElement | null>(null)

const model = computed(() => store.selectedModel)
const messages = computed(() => store.currentMessages())

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function scrollToBottom() {
  await nextTick()
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}

watch(() => messages.value.length, scrollToBottom)
watch(() => store.isTyping, scrollToBottom)

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || store.isTyping || !model.value) return
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
  if (!model.value) return
  try {
    await ElMessageBox.confirm(
      t('marketplace.chat.clearConfirm', { name: model.value.name }),
      t('marketplace.chat.clear'),
      { confirmButtonText: t('marketplace.chat.clear'), cancelButtonText: t('marketplace.chat.cancel'), type: 'warning' },
    )
    store.clearChat(model.value.id)
  } catch { /* cancelled */ }
}
</script>

<template>
  <el-drawer
    v-model="drawerVisible"
    direction="rtl"
    size="520px"
    :show-close="false"
    class="chat-drawer"
  >
    <template #header>
      <div class="drawer-header" v-if="model" :style="{ '--accent': model.providerColor }">
        <div class="dh-accent" />
        <div class="dh-info">
          <div class="dh-title">{{ model.name }}</div>
          <div class="dh-meta">
            <span class="dh-provider">{{ model.provider }}</span>
            <span class="dh-sep">·</span>
            <span class="dh-cost">{{ model.inputPrice }} in · {{ model.outputPrice }} out / MTok</span>
          </div>
        </div>
        <el-button :icon="Delete" size="small" text type="danger" class="dh-clear" title="Clear" @click="handleClear" />
        <el-button size="small" text class="dh-close" @click="drawerVisible = false">✕</el-button>
      </div>
    </template>

    <div class="chat-body">

      <!-- Messages -->
      <div ref="messagesEl" class="messages">

        <div v-if="messages.length === 0 && !store.isTyping" class="msg-empty">
          <div class="msg-empty-name">{{ model?.name }}</div>
          <div class="msg-empty-hint">{{ t('marketplace.chat.empty') }}</div>
        </div>

        <div
          v-for="msg in messages"
          :key="msg.id"
          class="msg-row"
          :class="msg.role === 'user' ? 'msg-row--user' : 'msg-row--assistant'"
        >
          <div class="bubble-wrap">
            <div class="bubble" :class="msg.role === 'user' ? 'bubble--user' : 'bubble--assistant'">
              {{ msg.content }}
            </div>
            <div class="bubble-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>

        <div v-if="store.isTyping" class="msg-row msg-row--assistant">
          <div class="bubble-wrap">
            <div class="bubble bubble--assistant typing-bubble">
              <span class="dot" /><span class="dot" /><span class="dot" />
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
            :placeholder="t('marketplace.chat.placeholder')"
            resize="none"
            :disabled="store.isTyping"
            class="composer-input"
            @keydown="handleKeydown"
          />
          <div class="composer-row">
            <span class="composer-hint">{{ t('marketplace.chat.hint') }}</span>
            <el-button
              type="primary"
              size="small"
              :disabled="!inputText.trim() || store.isTyping"
              @click="handleSend"
            >{{ t('marketplace.chat.send') }}</el-button>
          </div>
        </div>
      </div>

    </div>
  </el-drawer>
</template>

<style scoped>
/* Override el-drawer internals */
:deep(.el-drawer) {
  display: flex;
  flex-direction: column;
}

:deep(.el-drawer__header) {
  padding: 0;
  margin: 0;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

:deep(.el-drawer__body) {
  flex: 1;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Drawer header */
.drawer-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
}

.dh-accent {
  width: 3px;
  height: 32px;
  border-radius: 2px;
  background: var(--accent);
  flex-shrink: 0;
}

.dh-info {
  flex: 1;
  min-width: 0;
}

.dh-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
}

.dh-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 1px;
}

.dh-provider {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text);
  opacity: 0.4;
}

.dh-sep { font-size: 0.7rem; opacity: 0.25; }

.dh-cost {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.4;
}

.dh-clear, .dh-close { opacity: 0.4; transition: opacity 0.15s; }
.dh-clear:hover, .dh-close:hover { opacity: 1; }

/* Chat body */
.chat-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Messages */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.msg-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  gap: 8px;
}

.msg-empty-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  opacity: 0.5;
}

.msg-empty-hint {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.3;
}

.msg-row {
  display: flex;
  align-items: flex-end;
}

.msg-row--user { justify-content: flex-end; }
.msg-row--assistant { justify-content: flex-start; }

.bubble-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 80%;
}

.msg-row--user .bubble-wrap { align-items: flex-end; }

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

/* Typing */
.typing-bubble {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 12px 14px;
}

.dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--color-text);
  opacity: 0.35;
  animation: dot-bounce 1.1s infinite ease-in-out;
}
.dot:nth-child(2) { animation-delay: 0.18s; }
.dot:nth-child(3) { animation-delay: 0.36s; }

@keyframes dot-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
  30%           { transform: translateY(-4px); opacity: 0.7; }
}

/* Composer */
.composer {
  flex-shrink: 0;
  padding: 14px 16px 18px;
  border-top: 1px solid var(--color-border);
}

.composer-inner {
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
}

.composer-input :deep(.el-textarea__inner:focus) { box-shadow: none; }

.composer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.composer-hint {
  font-size: 0.65rem;
  color: var(--color-text);
  opacity: 0.25;
}
</style>
