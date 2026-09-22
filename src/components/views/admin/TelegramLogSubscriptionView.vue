<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { useToast } from '@/composables/useToast'

interface SubscriptionRow {
  key: string
  label: string
  enabled: boolean
}

const { t } = useI18n()
const toast = useToast()

const loading = ref(true)
const rows = ref<SubscriptionRow[]>([])
const savingKey = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    const res = await HttpClient.get(ApiRoute.TELEGRAM_LOG_SUBSCRIPTION.ADMIN_LIST)
    rows.value = res.data.data
  } catch {
    toast.error(t('admin.telegramLogSubscriptions.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function onToggle(row: SubscriptionRow, next: boolean) {
  savingKey.value = row.key
  try {
    const res = await HttpClient.post(ApiRoute.TELEGRAM_LOG_SUBSCRIPTION.ADMIN_TOGGLE(row.key), { enabled: next })
    rows.value = res.data.data
  } catch {
    row.enabled = !next
    toast.error(t('admin.telegramLogSubscriptions.toggleFailed'))
  } finally {
    savingKey.value = null
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

    <ul v-else class="tlp-list">
      <li v-for="row in rows" :key="row.key" class="tlp-row">
        <span class="tlp-label">{{ row.label }}</span>
        <el-switch
          v-model="row.enabled"
          :loading="savingKey === row.key"
          @change="(val: string | number | boolean) => onToggle(row, val as boolean)"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.tlp-page {
  max-width: 700px;
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

.tlp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tlp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 12px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.tlp-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
}
</style>
