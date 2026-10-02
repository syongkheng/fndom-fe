<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { CopyDocument } from '@element-plus/icons-vue'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { useToast } from '@/composables/useToast'
import { logStatusLevel } from '@/utilities/LogStatusIcon'
import PageBackButton from '@/components/common/PageBackButton.vue'

// ── Shapes returned by qindom (see qindom src/models/dtos/RequestLogDto.ts) ──

type PipelineStage = 'middleware' | 'controller' | 'service'

interface RequestLogEvent {
  stage: PipelineStage
  type: string
  message: string
  isError: boolean
  lines: string[]
  durationMs: number | null
  stack: string[]
}

interface RequestLogEntry {
  requestId: string | null
  timestamp: string
  method: string
  path: string
  ip: string | null
  payload: string | null
  events: RequestLogEvent[]
  statusCode: number | null
  statusText: string | null
  response: string | null
  durationMs: number | null
}

interface RequestLogMatch {
  raw: string
  timestamp: string
  method: string
  path: string
  statusCode: number | null
  requestId: string | null
  entry: RequestLogEntry | null
}

interface RecentRequest {
  requestId: string | null
  timestamp: string
  method: string
  path: string
  statusCode: number | null
}

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const router = useRouter()

// 12 hex = current ids; 5 hex = ids in older log files
const REQUEST_ID_RE = /^req_([0-9a-f]{12}|[0-9a-f]{5})$/i

const requestId = ref('')
const loading = ref(false)
const results = ref<RequestLogMatch[] | null>(null)
const selectedIndex = ref(0)
const viewMode = ref<'structured' | 'raw'>('structured')

const selected = computed(() => results.value?.[selectedIndex.value] ?? null)
const entry = computed(() => selected.value?.entry ?? null)

// ── Search ────────────────────────────────────────────────────────────────

async function search(idOverride?: string) {
  const id = (idOverride ?? requestId.value).trim()
  if (!id) return
  requestId.value = id

  if (!REQUEST_ID_RE.test(id)) {
    toast.error(t('admin.logSearcher.invalidFormat'))
    return
  }

  loading.value = true
  results.value = null
  selectedIndex.value = 0
  viewMode.value = 'structured'
  try {
    const res = await HttpClient.get(ApiRoute.ADMIN.SEARCH_REQUEST_LOG(id))
    results.value = res.data.data
    rememberSearch(id)
  } catch {
    results.value = []
  } finally {
    loading.value = false
  }

  // Shareable URL; replace (not push) so Back still leaves the page
  if (route.query.requestId !== id) router.replace({ query: { ...route.query, requestId: id } })
}

function onPaste(e: ClipboardEvent) {
  const pasted = e.clipboardData?.getData('text')?.trim() ?? ''
  if (!REQUEST_ID_RE.test(pasted)) return
  e.preventDefault()
  requestId.value = pasted
  nextTick(() => search(pasted))
}

// ── Recent searches (this browser only) ───────────────────────────────────

const RECENT_KEY = 'fndom-log-searcher-recent'
const MAX_RECENT = 6

function loadRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string').slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

const recentSearches = ref<string[]>(loadRecent())

function rememberSearch(id: string) {
  recentSearches.value = [id, ...recentSearches.value.filter((x) => x !== id)].slice(0, MAX_RECENT)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentSearches.value))
  } catch {
    // storage unavailable — recents just won't persist
  }
}

// ── Latest requests (empty state) ─────────────────────────────────────────

const recentRequests = ref<RecentRequest[]>([])

// Background chatter that would otherwise fill the list (incl. this page's own calls)
const NOISE_PATHS = ['/analytics/heartbeat', '/auth/admin/request-logs', '/auth/admin/recent-request-logs']
const isNoise = (path: string) => NOISE_PATHS.some((p) => path.replace(/^\/api/, '').startsWith(p))

async function loadRecentRequests() {
  const res = await HttpClient.get(ApiRoute.ADMIN.RECENT_REQUEST_LOGS(20)).catch(() => null)
  const rows = (res?.data?.data as RecentRequest[] | undefined) ?? []
  recentRequests.value = rows.filter((r) => !isNoise(r.path)).slice(0, 10)
}

// ── Formatting helpers ────────────────────────────────────────────────────

const statusLevel = (code: number | null) => (code === null ? 'neutral' : logStatusLevel(code))
const statusLabel = (code: number | null, text?: string | null) => [code ?? '—', text].filter(Boolean).join(' ')

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Server writes local time without a zone ("2026-10-02 10:49:41.185"), so it's
// reformatted as-is rather than parsed as a Date (which would shift it).
function formatTimestamp(ts: string): string {
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2}:\d{2})/)
  if (!m) return ts
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}, ${m[4]}`
}

function prettyJson(text: string | null): string {
  if (!text) return ''
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

const isEmptyJson = (text: string | null) => !text || text === '{}' || text === '[]' || text === 'null'

// "tb_aa_user.findOne() - 1ms" → text + right-aligned timing
function splitTiming(line: string): { text: string; ms: string | null } {
  const m = line.match(/^(.*) - (\d+ms)$/)
  return m ? { text: m[1], ms: m[2] } : { text: line, ms: null }
}

// Highlight frames from qindom's own code; dim library/runtime frames
const isAppFrame = (frame: string) => frame.includes('src/') && !frame.includes('node_modules')

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(t('admin.logSearcher.copied'))
  } catch {
    // clipboard blocked — nothing useful to do
  }
}

// ── The "what went wrong" callout ─────────────────────────────────────────

interface Problem {
  title: string
  message: string | null
  stack: string[]
}

// ── Pipeline timeline: Request → Middleware → Controller → Service → Response ──

const STAGE_ORDER: PipelineStage[] = ['middleware', 'controller', 'service']

interface PipelineGroup {
  stage: PipelineStage
  events: RequestLogEvent[]
  /** Shown instead of events when the stage logged nothing */
  placeholder: string | null
  failed: boolean
}

const failedLine = (line: string) => line.includes('❌')

const pipeline = computed<PipelineGroup[]>(() => {
  const e = entry.value
  if (!e) return []

  // Consecutive events of the same stage form one group, in the order they ran —
  // so an exception caught by the controller after a service call shows as
  // controller → service → controller.
  const groups: PipelineGroup[] = []
  for (const ev of e.events) {
    const last = groups[groups.length - 1]
    if (last && last.stage === ev.stage) last.events.push(ev)
    else groups.push({ stage: ev.stage, events: [ev], placeholder: null, failed: false })
  }

  const present = new Set(groups.map((g) => g.stage))
  const failedRequest = (e.statusCode ?? 0) >= 400
  // A failure with only middleware events means a middleware rejected it
  const rejectedInMiddleware = failedRequest && present.has('middleware') && !present.has('controller') && !present.has('service')

  // Every stage always appears, in pipeline order, even if it logged nothing
  for (const stage of STAGE_ORDER) {
    if (present.has(stage)) continue
    let placeholder: string
    if (stage === 'middleware') placeholder = t(failedRequest && !groups.length ? 'admin.logSearcher.stageEmpty' : 'admin.logSearcher.stagePassed')
    else if (rejectedInMiddleware) placeholder = t('admin.logSearcher.stageNotReached')
    else placeholder = t(stage === 'service' ? 'admin.logSearcher.stageNoService' : 'admin.logSearcher.stageEmpty')

    const rank = STAGE_ORDER.indexOf(stage)
    const insertAt = groups.findIndex((g) => STAGE_ORDER.indexOf(g.stage) > rank)
    groups.splice(insertAt === -1 ? groups.length : insertAt, 0, { stage, events: [], placeholder, failed: false })
  }

  for (const g of groups) {
    g.failed =
      g.events.some((ev) => ev.isError || ev.lines.some(failedLine)) || (rejectedInMiddleware && g.stage === 'middleware')
  }
  return groups
})

const problem = computed<Problem | null>(() => {
  const e = entry.value
  if (!e || e.statusCode === null || e.statusCode < 400) return null

  if (e.statusCode >= 500) {
    const failure = e.events.find((ev) => ev.isError)
    if (failure) return { title: failure.message, message: failure.lines[0] ?? null, stack: failure.stack }
  }

  // 4xx (or a 5xx without an exception event): the response envelope says why
  try {
    const body = JSON.parse(e.response ?? '')
    const message = typeof body?.data === 'string' ? body.data : body?.data ? JSON.stringify(body.data, null, 2) : null
    return { title: typeof body?.status === 'string' ? body.status : (e.statusText ?? ''), message, stack: [] }
  } catch {
    return { title: e.statusText ?? String(e.statusCode), message: null, stack: [] }
  }
})

const isFailure = computed(() => (entry.value?.statusCode ?? 0) >= 400)
const openSections = ref<string[]>([])
const stackOpen = ref(true)

watch(entry, (e) => {
  // Bodies are expanded by default only when the request failed (and non-empty)
  const failed = !!e && (e.statusCode ?? 0) >= 400
  openSections.value = failed
    ? [...(isEmptyJson(e!.payload) ? [] : ['payload']), ...(e!.response ? ['response'] : [])]
    : []
  stackOpen.value = true
})

// ── Lifecycle ─────────────────────────────────────────────────────────────

onMounted(() => {
  const prefill = route.query.requestId
  if (typeof prefill === 'string' && prefill) search(prefill)
  loadRecentRequests()
})

// Telegram link opened while the page is already showing another request
watch(
  () => route.query.requestId,
  (id) => {
    if (typeof id === 'string' && id && id !== requestId.value) search(id)
  },
)
</script>

<template>
  <div class="page-container log-searcher-page">
    <header class="ls-header">
      <PageBackButton />
      <div>
        <h1 class="ls-title">{{ t('admin.logSearcher.title') }}</h1>
        <p class="ls-subtitle">{{ t('admin.logSearcher.subtitle') }}</p>
      </div>
    </header>

    <!-- Search -->
    <div class="ls-search-bar">
      <el-input
        v-model="requestId"
        :placeholder="t('admin.logSearcher.placeholder')"
        clearable
        class="ls-search-input"
        @keyup.enter="search()"
        @paste="onPaste"
      />
      <el-button type="primary" :loading="loading" @click="search()">
        {{ t('admin.logSearcher.search') }}
      </el-button>
    </div>

    <div v-if="recentSearches.length" class="ls-recent">
      <span class="ls-recent-label">{{ t('admin.logSearcher.recentSearches') }}</span>
      <button v-for="id in recentSearches" :key="id" type="button" class="ls-chip" @click="search(id)">
        {{ id }}
      </button>
    </div>

    <div v-if="loading" class="ls-card ls-loading"><el-skeleton :rows="6" animated /></div>

    <!-- Results -->
    <template v-else-if="results && results.length">
      <!-- Old 5-char ids can collide: let the user pick -->
      <div v-if="results.length > 1" class="ls-matches">
        <p class="ls-matches-hint">{{ t('admin.logSearcher.multipleMatches', { n: results.length }) }}</p>
        <button
          v-for="(match, idx) in results"
          :key="idx"
          type="button"
          class="ls-row"
          :class="{ 'ls-row--active': idx === selectedIndex }"
          @click="selectedIndex = idx"
        >
          <span class="ls-pill" :class="`ls-pill--${statusLevel(match.statusCode)}`">{{ match.statusCode ?? '—' }}</span>
          <span class="ls-row-method">{{ match.method }}</span>
          <span class="ls-row-path">{{ match.path }}</span>
          <span class="ls-row-time">{{ formatTimestamp(match.timestamp) }}</span>
        </button>
      </div>

      <article v-if="selected" class="ls-card">
        <!-- Summary -->
        <div class="ls-summary">
          <div class="ls-summary-main">
            <div class="ls-summary-route">
              <span class="ls-pill ls-pill--lg" :class="`ls-pill--${statusLevel(selected.statusCode)}`">
                {{ statusLabel(selected.statusCode, entry?.statusText) }}
              </span>
              <code class="ls-route"><span class="ls-method">{{ selected.method }}</span> {{ selected.path }}</code>
            </div>
            <div class="ls-meta">
              <span>{{ formatTimestamp(selected.timestamp) }}</span>
              <span v-if="entry?.durationMs !== null && entry?.durationMs !== undefined">{{ entry.durationMs }} ms</span>
              <span v-if="entry?.ip">{{ t('admin.logSearcher.client') }} {{ entry.ip }}</span>
              <button
                v-if="selected.requestId"
                type="button"
                class="ls-id"
                :title="t('admin.logSearcher.copyRequestId')"
                @click="copy(selected.requestId)"
              >
                <code>{{ selected.requestId }}</code>
                <el-icon><CopyDocument /></el-icon>
              </button>
            </div>
          </div>
          <el-segmented
            v-if="entry"
            v-model="viewMode"
            size="small"
            :options="[
              { label: t('admin.logSearcher.structured'), value: 'structured' },
              { label: t('admin.logSearcher.raw'), value: 'raw' },
            ]"
          />
        </div>

        <!-- Structured view -->
        <template v-if="entry && viewMode === 'structured'">
          <!-- What went wrong -->
          <section
            v-if="problem"
            class="ls-problem"
            :class="(entry.statusCode ?? 0) >= 500 ? 'ls-problem--danger' : 'ls-problem--warning'"
          >
            <p class="ls-problem-title">{{ problem.title }}</p>
            <pre v-if="problem.message" class="ls-problem-message">{{ problem.message }}</pre>
            <template v-if="problem.stack.length">
              <button type="button" class="ls-stack-toggle" @click="stackOpen = !stackOpen">
                {{ stackOpen ? '▾' : '▸' }} {{ t('admin.logSearcher.stack') }}
              </button>
              <ol v-if="stackOpen" class="ls-stack">
                <li v-for="(frame, i) in problem.stack" :key="i" :class="{ 'ls-frame--app': isAppFrame(frame) }">
                  {{ frame }}
                </li>
              </ol>
            </template>
          </section>

          <!-- Pipeline timeline -->
          <section class="ls-section">
            <h2 class="ls-section-title">{{ t('admin.logSearcher.timeline') }}</h2>
            <ol class="ls-flow">
              <li class="ls-stage ls-stage--edge">
                <div class="ls-stage-head">
                  <span class="ls-stage-dot" />
                  <span class="ls-stage-name">{{ t('admin.logSearcher.stages.request') }}</span>
                </div>
                <p class="ls-stage-summary">
                  <code>{{ entry.method }} {{ entry.path }}</code>
                  <span v-if="entry.ip" class="ls-muted"> · {{ t('admin.logSearcher.client') }} {{ entry.ip }}</span>
                </p>
              </li>

              <li
                v-for="(group, gi) in pipeline"
                :key="gi"
                class="ls-stage"
                :class="{ 'ls-stage--failed': group.failed, 'ls-stage--empty': !group.events.length }"
              >
                <div class="ls-stage-head">
                  <span class="ls-stage-dot" />
                  <span class="ls-stage-name">{{ t(`admin.logSearcher.stages.${group.stage}`) }}</span>
                </div>
                <p v-if="group.placeholder" class="ls-stage-placeholder">{{ group.placeholder }}</p>
                <ul v-else class="ls-stage-events">
                  <li v-for="(ev, i) in group.events" :key="i" class="ls-step" :class="{ 'ls-step--error': ev.isError }">
                    <div class="ls-step-head">
                      <span class="ls-type" :class="`ls-type--${ev.type.toLowerCase()}`">{{ ev.type }}</span>
                      <span class="ls-step-message">{{ ev.message }}</span>
                      <span v-if="ev.durationMs !== null" class="ls-ms">{{ ev.durationMs }}ms</span>
                    </div>
                    <ul v-if="ev.lines.length" class="ls-step-lines">
                      <li v-for="(line, j) in ev.lines" :key="j" :class="{ 'ls-line--failed': failedLine(line) }">
                        <span class="ls-step-line-text">{{ splitTiming(line).text }}</span>
                        <span v-if="splitTiming(line).ms" class="ls-ms">{{ splitTiming(line).ms }}</span>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>

              <li class="ls-stage ls-stage--edge" :class="`ls-stage--${statusLevel(entry.statusCode)}`">
                <div class="ls-stage-head">
                  <span class="ls-stage-dot" />
                  <span class="ls-stage-name">{{ t('admin.logSearcher.stages.response') }}</span>
                </div>
                <p class="ls-stage-summary">
                  <span class="ls-pill" :class="`ls-pill--${statusLevel(entry.statusCode)}`">
                    {{ statusLabel(entry.statusCode, entry.statusText) }}
                  </span>
                  <span v-if="entry.durationMs !== null" class="ls-muted"> · {{ entry.durationMs }} ms</span>
                </p>
              </li>
            </ol>
          </section>

          <!-- Bodies -->
          <el-collapse v-model="openSections" class="ls-bodies">
            <el-collapse-item name="payload">
              <template #title>
                <span class="ls-body-title">{{ t('admin.logSearcher.payload') }}</span>
                <span v-if="isEmptyJson(entry.payload)" class="ls-muted ls-body-empty">{{ t('admin.logSearcher.none') }}</span>
              </template>
              <div class="ls-code-wrap">
                <el-button v-if="entry.payload" size="small" text :icon="CopyDocument" class="ls-code-copy" @click="copy(prettyJson(entry.payload))">
                  {{ t('admin.logSearcher.copy') }}
                </el-button>
                <pre class="ls-code">{{ entry.payload ? prettyJson(entry.payload) : '—' }}</pre>
              </div>
            </el-collapse-item>
            <el-collapse-item name="response">
              <template #title>
                <span class="ls-body-title">{{ t('admin.logSearcher.response') }}</span>
                <span v-if="!entry.response" class="ls-muted ls-body-empty">{{ t('admin.logSearcher.none') }}</span>
              </template>
              <div class="ls-code-wrap">
                <el-button v-if="entry.response" size="small" text :icon="CopyDocument" class="ls-code-copy" @click="copy(prettyJson(entry.response))">
                  {{ t('admin.logSearcher.copy') }}
                </el-button>
                <pre class="ls-code">{{ entry.response ? prettyJson(entry.response) : '—' }}</pre>
              </div>
            </el-collapse-item>
          </el-collapse>
        </template>

        <!-- Raw view (and fallback when an entry couldn't be parsed) -->
        <template v-else>
          <p v-if="!entry" class="ls-muted ls-raw-note">{{ t('admin.logSearcher.rawFallback') }}</p>
          <div class="ls-code-wrap ls-raw-wrap">
            <el-button size="small" text :icon="CopyDocument" class="ls-code-copy" @click="copy(selected.raw)">
              {{ t('admin.logSearcher.copyAll') }}
            </el-button>
            <pre class="ls-code">{{ selected.raw }}</pre>
          </div>
        </template>
      </article>
    </template>

    <!-- Not found -->
    <div v-else-if="results && results.length === 0" class="ls-card ls-empty">
      <p class="ls-empty-title">{{ t('admin.logSearcher.notFound') }}</p>
      <p class="ls-muted">{{ t('admin.logSearcher.notFoundHint') }}</p>
    </div>

    <!-- Nothing searched yet: latest requests -->
    <section v-if="!loading && !results && recentRequests.length" class="ls-card ls-latest">
      <h2 class="ls-section-title">{{ t('admin.logSearcher.recentRequests') }}</h2>
      <p class="ls-muted ls-latest-hint">{{ t('admin.logSearcher.recentRequestsHint') }}</p>
      <button
        v-for="(req, idx) in recentRequests"
        :key="req.requestId ?? idx"
        type="button"
        class="ls-row"
        :disabled="!req.requestId"
        @click="req.requestId && search(req.requestId)"
      >
        <span class="ls-pill" :class="`ls-pill--${statusLevel(req.statusCode)}`">{{ req.statusCode ?? '—' }}</span>
        <span class="ls-row-method">{{ req.method }}</span>
        <span class="ls-row-path">{{ req.path }}</span>
        <span class="ls-row-time">{{ formatTimestamp(req.timestamp) }}</span>
      </button>
    </section>
  </div>
</template>

<style scoped>
.log-searcher-page {
  --ls-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  max-width: 920px;
  width: 100%;
  /* Grid item: without this, wide <pre> blocks stretch the page on mobile */
  min-width: 0;
  justify-self: center;
  padding-bottom: 48px;
}

.ls-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 24px 0 20px;
}

.ls-title {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--color-heading);
  margin: 0 0 4px;
}

.ls-subtitle,
.ls-muted {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.55;
  margin: 0;
}

/* ── Search ─────────────────────────────────────────────── */

.ls-search-bar {
  display: flex;
  gap: 8px;
}

.ls-search-input :deep(input) {
  font-family: var(--ls-mono);
}

.ls-recent {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}

.ls-recent-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.45;
  margin-right: 2px;
}

.ls-chip {
  font-family: var(--ls-mono);
  font-size: 0.74rem;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}

.ls-chip:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

/* ── Cards ──────────────────────────────────────────────── */

.ls-card {
  margin-top: 20px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-background-soft);
  overflow: hidden;
}

.ls-loading,
.ls-empty,
.ls-latest {
  padding: 18px 20px;
}

.ls-empty-title {
  font-weight: 700;
  color: var(--color-heading);
  margin: 0 0 4px;
}

/* ── Status pills ───────────────────────────────────────── */

.ls-pill {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-family: var(--ls-mono);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
}

.ls-pill--lg {
  font-family: inherit;
  font-size: 0.82rem;
  padding: 4px 12px;
}

.ls-pill--success { color: var(--el-color-success-dark-2); background: var(--el-color-success-light-9); border-color: var(--el-color-success-light-7); }
.ls-pill--warning { color: var(--el-color-warning-dark-2); background: var(--el-color-warning-light-9); border-color: var(--el-color-warning-light-7); }
.ls-pill--danger { color: var(--el-color-danger-dark-2); background: var(--el-color-danger-light-9); border-color: var(--el-color-danger-light-7); }
.ls-pill--neutral { color: var(--color-text); background: var(--color-background-mute); }

/* ── Match / recent rows ────────────────────────────────── */

.ls-matches {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ls-matches-hint {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.7;
  margin: 0 0 4px;
}

.ls-latest-hint {
  margin: 2px 0 10px;
}

.ls-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.ls-latest .ls-row + .ls-row {
  margin-top: 6px;
}

.ls-row:hover,
.ls-row--active {
  border-color: var(--el-color-primary);
}

.ls-row:disabled {
  cursor: default;
  opacity: 0.6;
}

.ls-row-method {
  font-family: var(--ls-mono);
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--color-heading);
  flex-shrink: 0;
}

.ls-row-path {
  font-family: var(--ls-mono);
  font-size: 0.78rem;
  color: var(--color-text);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ls-row-time {
  font-size: 0.74rem;
  color: var(--color-text);
  opacity: 0.55;
  flex-shrink: 0;
}

/* ── Summary ────────────────────────────────────────────── */

.ls-summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--color-border);
}

.ls-summary-main {
  min-width: 0;
}

.ls-summary-route {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.ls-route {
  font-family: var(--ls-mono);
  font-size: 0.95rem;
  color: var(--color-heading);
  word-break: break-all;
}

.ls-method {
  font-weight: 800;
}

.ls-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 14px;
  margin-top: 8px;
  font-size: 0.8rem;
  color: var(--color-text);
}

.ls-meta > span {
  opacity: 0.65;
}

.ls-id {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.76rem;
  cursor: pointer;
}

.ls-id code {
  font-family: var(--ls-mono);
}

.ls-id:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

/* ── Problem callout ────────────────────────────────────── */

.ls-problem {
  margin: 16px 20px 0;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid;
}

.ls-problem--warning { background: var(--el-color-warning-light-9); border-color: var(--el-color-warning-light-5); }
.ls-problem--danger { background: var(--el-color-danger-light-9); border-color: var(--el-color-danger-light-5); }

.ls-problem-title {
  font-family: var(--ls-mono);
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
  word-break: break-word;
}

.ls-problem-message {
  margin: 6px 0 0;
  font-family: var(--ls-mono);
  font-size: 0.82rem;
  color: var(--color-heading);
  white-space: pre-wrap;
  word-break: break-word;
}

.ls-stack-toggle {
  margin-top: 10px;
  padding: 0;
  border: none;
  background: none;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--color-text);
  opacity: 0.75;
  cursor: pointer;
}

.ls-stack {
  list-style: none;
  margin: 6px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--color-background);
  font-family: var(--ls-mono);
  font-size: 0.74rem;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
}

.ls-stack li {
  opacity: 0.45;
}

.ls-stack li.ls-frame--app {
  opacity: 1;
  font-weight: 700;
  color: var(--color-heading);
}

/* ── Timeline ───────────────────────────────────────────── */

.ls-section {
  padding: 16px 20px 4px;
}

.ls-section-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
  margin: 0 0 10px;
}

/* Pipeline: one node per stage on a vertical rail; events nested under it */
.ls-flow {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ls-stage {
  position: relative;
  padding: 0 0 16px 26px;
}

/* Rail connecting the stage dots */
.ls-stage::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 10px;
  bottom: -10px;
  width: 2px;
  background: var(--color-border);
}

.ls-stage:last-child::before {
  display: none;
}

.ls-stage-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: -26px;
}

.ls-stage-dot {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  /* Neutral by default — the brand colour is red, so it would read as an error */
  border: 2px solid var(--color-text);
  background: var(--color-background-soft);
  opacity: 0.85;
}

.ls-stage--edge .ls-stage-dot {
  background: var(--color-text);
}

.ls-stage--empty .ls-stage-dot {
  border-style: dashed;
  border-color: var(--color-border);
}

.ls-stage--failed .ls-stage-dot,
.ls-stage--danger .ls-stage-dot {
  border-color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  opacity: 1;
}

.ls-stage--warning .ls-stage-dot {
  border-color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
  opacity: 1;
}

.ls-stage--success .ls-stage-dot {
  border-color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  opacity: 1;
}

.ls-stage-name {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-heading);
}

.ls-stage--empty .ls-stage-name {
  opacity: 0.5;
}

.ls-stage--failed .ls-stage-name {
  color: var(--el-color-danger);
}

.ls-stage-summary {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: var(--color-heading);
  overflow-wrap: anywhere;
}

.ls-stage-summary code {
  font-family: var(--ls-mono);
}

.ls-stage-placeholder {
  margin: 2px 0 0;
  font-size: 0.8rem;
  font-style: italic;
  color: var(--color-text);
  opacity: 0.5;
}

.ls-stage-events {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ls-step {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
}

.ls-step--error {
  border-color: var(--el-color-danger-light-5);
  background: var(--el-color-danger-light-9);
}

.ls-line--failed .ls-step-line-text {
  color: var(--el-color-danger);
  opacity: 1;
}

.ls-step-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.ls-type {
  flex-shrink: 0;
  font-family: var(--ls-mono);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--color-text);
  background: var(--color-background-mute);
}

.ls-type--error { color: var(--el-color-danger-dark-2); background: var(--el-color-danger-light-9); }
.ls-type--warn { color: var(--el-color-warning-dark-2); background: var(--el-color-warning-light-9); }
.ls-type--auth { color: var(--el-color-primary-dark-2); background: var(--el-color-primary-light-9); }

.ls-step-message {
  font-size: 0.86rem;
  color: var(--color-heading);
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.ls-step--error .ls-step-message {
  font-weight: 700;
}

.ls-ms {
  flex-shrink: 0;
  font-family: var(--ls-mono);
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.6;
}

.ls-step-lines {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
}

.ls-step-lines li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-family: var(--ls-mono);
  font-size: 0.74rem;
  line-height: 1.6;
  color: var(--color-text);
}

.ls-step-line-text {
  opacity: 0.8;
  min-width: 0;
  overflow-wrap: anywhere;
}

/* ── Bodies + raw ───────────────────────────────────────── */

.ls-bodies {
  margin: 4px 20px 16px;
  border-top: none;
  border-bottom: none;
}

.ls-problem,
.ls-section,
.ls-bodies,
.ls-code-wrap {
  min-width: 0;
}

.ls-bodies :deep(.el-collapse-item__header),
.ls-bodies :deep(.el-collapse-item__wrap) {
  background: transparent;
}

.ls-body-title {
  font-weight: 700;
  color: var(--color-heading);
}

.ls-body-empty {
  margin-left: 8px;
  font-size: 0.78rem;
}

.ls-code-wrap {
  position: relative;
}

.ls-code-copy {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 1;
}

.ls-code {
  margin: 0;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  font-family: var(--ls-mono);
  font-size: 0.76rem;
  line-height: 1.55;
  color: var(--color-heading);
  overflow-x: auto;
  white-space: pre;
}

.ls-raw-wrap {
  margin: 16px 20px 20px;
}

.ls-raw-note {
  padding: 14px 20px 0;
}

/* ── Mobile ─────────────────────────────────────────────── */

@media (max-width: 640px) {
  .ls-summary {
    flex-direction: column;
  }

  .ls-row-time {
    display: none;
  }

  .ls-section,
  .ls-summary {
    padding-left: 14px;
    padding-right: 14px;
  }

  .ls-problem,
  .ls-bodies {
    margin-left: 14px;
    margin-right: 14px;
  }

  .ls-raw-wrap {
    margin: 14px;
  }
}
</style>
