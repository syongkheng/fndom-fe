<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { useToast } from '@/composables/useToast'

interface ModuleCol {
  key: string
  label: string
}

interface ChatRow {
  chatId: number
  label: string
  enabled: Record<string, boolean>
}

const { t } = useI18n()
const toast = useToast()

const loading = ref(true)
const modules = ref<ModuleCol[]>([])
const chats = ref<ChatRow[]>([])
const savingCell = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    const res = await HttpClient.get(ApiRoute.TELEGRAM_LOG_SUBSCRIPTION.ADMIN_LIST)
    modules.value = res.data.data.modules
    chats.value = res.data.data.chats
  } catch {
    toast.error(t('admin.telegramLogSubscriptions.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function onToggle(chat: ChatRow, moduleKey: string, next: boolean) {
  const cellKey = `${chat.chatId}:${moduleKey}`
  savingCell.value = cellKey
  try {
    const res = await HttpClient.post(
      ApiRoute.TELEGRAM_LOG_SUBSCRIPTION.ADMIN_TOGGLE(chat.chatId, moduleKey),
      { enabled: next },
    )
    modules.value = res.data.data.modules
    chats.value = res.data.data.chats
  } catch {
    chat.enabled[moduleKey] = !next
    toast.error(t('admin.telegramLogSubscriptions.toggleFailed'))
  } finally {
    savingCell.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="page-container tlp-page">
    <header class="tlp-header">
      <h1 class="tlp-title">{{ t('admin.telegramLogSubscriptions.title') }}</h1>
      <p class="tlp-subtitle">{{ t('admin.telegramLogSubscriptions.subtitle') }}</p>
    </header>

    <div v-if="loading" class="tlp-loading">
      <el-skeleton :rows="8" animated />
    </div>

    <p v-else-if="!chats.length" class="tlp-empty">{{ t('admin.telegramLogSubscriptions.noChats') }}</p>

    <div v-else class="tlp-table-wrap">
      <table class="tlp-table">
        <thead>
          <tr>
            <th class="tlp-th-chat">{{ t('admin.telegramLogSubscriptions.chatCol') }}</th>
            <th v-for="mod in modules" :key="mod.key" :title="mod.label" class="tlp-th-module">
              {{ mod.key }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="chat in chats" :key="chat.chatId">
            <td class="tlp-td-chat">{{ chat.label }}</td>
            <td v-for="mod in modules" :key="mod.key" class="tlp-td-cell">
              <el-switch
                v-model="chat.enabled[mod.key]"
                size="small"
                :loading="savingCell === `${chat.chatId}:${mod.key}`"
                @change="(val: string | number | boolean) => onToggle(chat, mod.key, val as boolean)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.tlp-page {
  max-width: 100%;
  width: 100%;
  justify-self: center;
  padding-bottom: 48px;
}

.tlp-header {
  padding: 24px 0 20px;
}

.tlp-title {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--color-heading);
  margin: 0 0 4px;
}

.tlp-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.55;
  margin: 0;
  line-height: 1.5;
}

.tlp-empty {
  font-size: 0.88rem;
  color: var(--color-text);
  opacity: 0.5;
  padding: 24px 0;
}

.tlp-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.tlp-table {
  border-collapse: collapse;
  width: max-content;
  min-width: 100%;
}

.tlp-table th,
.tlp-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.tlp-th-chat,
.tlp-td-chat {
  position: sticky;
  left: 0;
  background: var(--color-background-soft);
  z-index: 1;
  border-right: 1px solid var(--color-border);
  font-weight: 600;
  color: var(--color-heading);
}

.tlp-th-module {
  font-family: monospace;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text);
  opacity: 0.6;
  text-align: center;
  background: var(--color-background-soft);
}

.tlp-td-cell {
  text-align: center;
}

.tlp-table tbody tr:last-child td {
  border-bottom: none;
}
</style>
