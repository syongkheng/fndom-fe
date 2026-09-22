<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { CircleCheck, CircleClose, WarningFilled } from '@element-plus/icons-vue'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { useToast } from '@/composables/useToast'

interface RequestLogMatch {
  raw: string
  timestamp: string
  method: string
  path: string
  statusCode: number | null
}

const { t } = useI18n()
const toast = useToast()
const route = useRoute()

const requestId = ref('')
const loading = ref(false)
const results = ref<RequestLogMatch[] | null>(null)
const activeNames = ref<number[]>([0])

async function search() {
  const id = requestId.value.trim()
  if (!id) return

  if (!/^req_[0-9a-f]{5}$/i.test(id)) {
    toast.error(t('admin.logSearcher.invalidFormat'))
    return
  }

  loading.value = true
  results.value = null
  try {
    const res = await HttpClient.get(ApiRoute.ADMIN.SEARCH_REQUEST_LOG(id))
    results.value = res.data.data
    activeNames.value = [0]
  } catch {
    results.value = []
    toast.error(t('admin.logSearcher.notFound'))
  } finally {
    loading.value = false
  }
}

function summary(match: RequestLogMatch): string {
  return `${match.timestamp} · ${match.method} ${match.path} · ${match.statusCode ?? '—'}`
}

// Matches LoggingUtilities.ts's render(): the RESPONSE line is always
// "└─ RESPONSE <code> <emoji>" — the emoji is console/Telegram's only way to
// show status (plain text). Only the code is extracted; whatever trailing
// emoji is there (its exact codepoints/variation selectors don't matter) is
// dropped since we render our own icon here instead.
const RESPONSE_LINE_RE = /^└─ RESPONSE (\d+)/

interface TreeLine {
  text: string
  statusCode?: number
  statusClass?: string
  icon?: typeof CircleCheck
}

function statusMeta(code: number) {
  if (code >= 500) return { statusClass: 'ls-status--danger', icon: CircleClose }
  if (code >= 400) return { statusClass: 'ls-status--warning', icon: WarningFilled }
  return { statusClass: 'ls-status--success', icon: CircleCheck }
}

function treeLines(raw: string): TreeLine[] {
  return raw.split('\n').map((text) => {
    const m = text.match(RESPONSE_LINE_RE)
    if (!m) return { text }
    const code = Number(m[1])
    return { text: `└─ RESPONSE ${code}`, statusCode: code, ...statusMeta(code) }
  })
}

onMounted(() => {
  const prefill = route.query.requestId
  if (typeof prefill === 'string' && prefill) {
    requestId.value = prefill
    search()
  }
})
</script>

<template>
  <div class="page-container log-searcher-page">
    <header class="ls-header">
      <h1 class="ls-title">{{ t('admin.logSearcher.title') }}</h1>
      <p class="ls-subtitle">{{ t('admin.logSearcher.subtitle') }}</p>
    </header>

    <div class="ls-search-bar">
      <el-input
        v-model="requestId"
        :placeholder="t('admin.logSearcher.placeholder')"
        clearable
        @keyup.enter="search"
      />
      <el-button type="primary" :loading="loading" @click="search">
        {{ t('admin.logSearcher.search') }}
      </el-button>
    </div>

    <div v-if="results && results.length > 0" class="ls-results">
      <p class="ls-result-count">{{ t('admin.logSearcher.resultCount', { n: results.length }) }}</p>

      <el-collapse v-model="activeNames">
        <el-collapse-item v-for="(match, idx) in results" :key="idx" :name="idx" :title="summary(match)">
          <div class="ls-tree">
            <div v-for="(line, lineIdx) in treeLines(match.raw)" :key="lineIdx" class="ls-tree-line">
              <template v-if="line.icon">
                <el-icon :class="line.statusClass" class="ls-status-icon"><component :is="line.icon" /></el-icon>
                <span :class="line.statusClass">{{ line.text }}</span>
              </template>
              <template v-else>{{ line.text }}</template>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <div v-else-if="results && results.length === 0" class="ls-empty">
      {{ t('admin.logSearcher.notFound') }}
    </div>
  </div>
</template>

<style scoped>
.log-searcher-page {
  max-width: 900px;
  width: 100%;
  justify-self: center;
  padding-bottom: 48px;
}

.ls-header {
  padding: 24px 0 20px;
}

.ls-title {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--color-heading);
  margin: 0 0 4px;
}

.ls-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.55;
  margin: 0;
}

.ls-search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.ls-result-count {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.5;
  margin: 0 0 10px;
}

.ls-tree {
  font-family: monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 14px 16px;
  margin: 0;
  overflow-x: auto;
}

.ls-tree-line {
  white-space: pre;
  display: flex;
  align-items: center;
  gap: 6px;
}

.ls-status-icon {
  flex-shrink: 0;
  font-size: 0.95rem;
}

.ls-status--success { color: var(--el-color-success); }
.ls-status--warning { color: var(--el-color-warning); }
.ls-status--danger { color: var(--el-color-danger); }

.ls-empty {
  font-size: 0.88rem;
  color: var(--color-text);
  opacity: 0.5;
  padding: 24px 0;
}
</style>
