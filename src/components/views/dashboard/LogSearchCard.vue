<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNav } from '@/hooks/useNav'
import { useToast } from '@/composables/useToast'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { logStatusIcon } from '@/utilities/LogStatusIcon'

interface RecentLog {
  timestamp: string
  method: string
  path: string
  statusCode: number | null
}

const { t } = useI18n()
const nav = useNav()
const toast = useToast()

const requestId = ref('')
const recentLogs = ref<RecentLog[]>([])

function search() {
  const id = requestId.value.trim()
  if (!id) return

  if (!/^req_[0-9a-f]{5}$/i.test(id)) {
    toast.error(t('admin.logSearcher.invalidFormat'))
    return
  }

  nav.redirectTo('/admin/log-searcher', { query: { requestId: id } })
}

function statusMeta(code: number | null) {
  if (code === null) return null
  const { level, icon } = logStatusIcon(code)
  return { statusClass: `lsc-status--${level}`, icon }
}

onMounted(async () => {
  try {
    const res = await HttpClient.get(ApiRoute.ADMIN.RECENT_REQUEST_LOGS(3))
    recentLogs.value = res.data.data
  } catch {
    // passive background fetch — fail silently, the search box still works
  }
})
</script>

<template>
  <div class="log-search-card">
    <p class="log-search-title">{{ t('admin.logSearcher.cardTile') }}</p>

    <div class="log-search-bar">
      <el-input
        v-model="requestId"
        :placeholder="t('admin.logSearcher.placeholder')"
        clearable
        @keyup.enter="search"
      />
      <el-button type="primary" @click="search">
        {{ t('admin.logSearcher.search') }}
      </el-button>
    </div>

    <ul v-if="recentLogs.length" class="lsc-recent-list">
      <li v-for="(log, idx) in recentLogs" :key="idx" class="lsc-recent-row">
        <el-icon v-if="statusMeta(log.statusCode)" :class="statusMeta(log.statusCode)!.statusClass" class="lsc-status-icon">
          <component :is="statusMeta(log.statusCode)!.icon" />
        </el-icon>
        <span class="lsc-recent-method">{{ log.method }}</span>
        <span class="lsc-recent-path">{{ log.path }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.log-search-card {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  max-width: 340px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.log-search-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
  margin-bottom: 10px;
}

.log-search-bar {
  display: flex;
  gap: 8px;
}

.lsc-recent-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lsc-recent-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  font-family: monospace;
  color: var(--color-text);
  opacity: 0.75;
  white-space: nowrap;
  overflow: hidden;
}

.lsc-status-icon {
  flex-shrink: 0;
  font-size: 0.85rem;
}

.lsc-status--success { color: var(--el-color-success); }
.lsc-status--warning { color: var(--el-color-warning); }
.lsc-status--danger { color: var(--el-color-danger); }

.lsc-recent-method {
  font-weight: 700;
  flex-shrink: 0;
}

.lsc-recent-path {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
