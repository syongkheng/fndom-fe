<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { CopyDocument } from '@element-plus/icons-vue'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { useBabyTrackingStore } from '@/stores/babyTracking'
import { StorageKey, StorageUtils } from '@/utilities/StorageUtils'
import type { DiaperLoadLevel } from '@/interfaces/Baby.model'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const store = useBabyTrackingStore()
const { t } = useI18n()

// ── Main tab ─────────────────────────────────────────────────
const activeMainTab = ref<'dashboard' | 'log' | 'history' | 'api-key'>(
  !!StorageUtils.get<string>(StorageKey.SS_API_KEY, 'local') ? 'log' : 'api-key',
)

const serverBaseUrl = import.meta.env.VITE_SERVER_BASE_URL as string

// ── API Key state ─────────────────────────────────────────────
const apiKeyLoading = ref(false)
const apiKeyStatus = ref<{ hasKey: boolean; createdDt: number | null; keyHint: string | null }>({ hasKey: false, createdDt: null, keyHint: null })
const localKeyPresent = ref(!!StorageUtils.get<string>(StorageKey.SS_API_KEY, 'local'))
const keyGenerating = ref(false)
const keyRevoking = ref(false)
const freshlyGeneratedKey = ref('')

async function copyAndDismiss() {
  await navigator.clipboard.writeText(freshlyGeneratedKey.value)
  ElMessage.success(t('toast.babyKeyCopied'))
  freshlyGeneratedKey.value = ''
}

function dismissGeneratedKey() {
  freshlyGeneratedKey.value = ''
}

const isUsable = computed(() => apiKeyStatus.value.hasKey && localKeyPresent.value)
const keyRelinkNeeded = computed(() => apiKeyStatus.value.hasKey && !localKeyPresent.value)

async function refreshApiKeyStatus() {
  apiKeyLoading.value = true
  try {
    apiKeyStatus.value = await store.fetchApiKeyStatus()
    if (!apiKeyStatus.value.hasKey) {
      StorageUtils.remove(StorageKey.SS_API_KEY, 'local')
      localKeyPresent.value = false
    }
  } catch {
    apiKeyStatus.value = { hasKey: localKeyPresent.value, createdDt: null, keyHint: null }
  } finally {
    apiKeyLoading.value = false
  }
}

async function handleGenerateKey() {
  keyGenerating.value = true
  try {
    const key = await store.generateApiKey()
    freshlyGeneratedKey.value = key
    localKeyPresent.value = true
    apiKeyStatus.value = await store.fetchApiKeyStatus()
    await Promise.allSettled([store.fetchFeeding(), store.fetchDiaper()])
    ElMessage({ type: 'warning', message: t('toast.babyKeyWarning'), duration: 6000 })
  } catch {
    ElMessage.error(t('toast.babyKeyFailed'))
  } finally {
    keyGenerating.value = false
  }
}

async function handleRegenerateKey() {
  try {
    await ElMessageBox.confirm(
      'Regenerating will revoke your current API key. Continue?',
      'Regenerate Key',
      { confirmButtonText: 'Regenerate', cancelButtonText: 'Cancel', type: 'warning' },
    )
    await handleGenerateKey()
  } catch { }
}

async function handleRevokeKey() {
  try {
    await ElMessageBox.confirm(
      'This will permanently revoke your API key. You will need to generate a new one to continue tracking.',
      'Revoke Key',
      { confirmButtonText: 'Revoke', cancelButtonText: 'Cancel', type: 'error' },
    )
    keyRevoking.value = true
    await store.revokeApiKey()
    localKeyPresent.value = false
    freshlyGeneratedKey.value = ''
    apiKeyStatus.value = { hasKey: false, createdDt: null, keyHint: null }
    ElMessage.success(t('toast.babyKeyRevoked'))
  } catch {
    // ElMessageBox cancel throws — ignore
  } finally {
    keyRevoking.value = false
  }
}

// ── Load options ─────────────────────────────────────────────
const LOAD_OPTIONS: { label: string; value: DiaperLoadLevel }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Medium', value: 'medium' },
  { label: 'Heavy', value: 'heavy' },
]

const loadTagType = (level: DiaperLoadLevel | null | undefined) => {
  if (level === 'heavy') return 'danger'
  if (level === 'medium') return 'warning'
  if (level === 'light') return 'info'
  return undefined
}

// ── Diaper form ───────────────────────────────────────────────
const diaperChangedAt = ref(new Date())
const diaperHasStool = ref(false)
const diaperHasUrine = ref(false)
const diaperStoolLoad = ref<DiaperLoadLevel | undefined>(undefined)
const diaperUrineLoad = ref<DiaperLoadLevel | undefined>(undefined)
const diaperSaving = ref(false)

const disableFutureDates = (date: Date) => date.getTime() > Date.now()

async function handleLogDiaper() {
  if (diaperHasStool.value && !diaperStoolLoad.value) {
    ElMessage.warning(t('toast.babyStoolRequired'))
    return
  }
  if (diaperHasUrine.value && !diaperUrineLoad.value) {
    ElMessage.warning(t('toast.babyUrineRequired'))
    return
  }

  diaperSaving.value = true
  try {
    await store.logDiaper({
      changedAt: diaperChangedAt.value.getTime(),
      hasStool: diaperHasStool.value,
      hasUrine: diaperHasUrine.value,
      stoolLoad: diaperHasStool.value ? diaperStoolLoad.value : undefined,
      urineLoad: diaperHasUrine.value ? diaperUrineLoad.value : undefined,
    })
    ElMessage.success(t('toast.babyDiaperLogged'))
    diaperChangedAt.value = new Date()
    diaperHasStool.value = false
    diaperHasUrine.value = false
    diaperStoolLoad.value = undefined
    diaperUrineLoad.value = undefined
  } catch {
    ElMessage.error(t('toast.babyDiaperFailed'))
  } finally {
    diaperSaving.value = false
  }
}

// ── Feeding form ──────────────────────────────────────────────
const feedingTiming = ref('')
const feedingQty = ref('')
const feedingSaving = ref(false)

async function handleLogFeeding() {
  if (!feedingTiming.value || !feedingQty.value) {
    ElMessage.warning(t('toast.babyFeedingRequired'))
    return
  }

  feedingSaving.value = true
  try {
    await store.logFeeding({ timing: feedingTiming.value, qty: feedingQty.value })
    ElMessage.success(t('toast.babyFeedingLogged'))
    feedingTiming.value = ''
    feedingQty.value = ''
  } catch {
    ElMessage.error(t('toast.babyFeedingFailed'))
  } finally {
    feedingSaving.value = false
  }
}

// ── Stats ─────────────────────────────────────────────────────
const isToday = (ts: number) => {
  const d = new Date(ts)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

const lastFeeding = computed(() => store.feedingRecords[0] ?? null)
const lastDiaper = computed(() => store.diaperRecords[0] ?? null)
const feedingsToday = computed(() => store.feedingRecords.filter(r => isToday(r.created_dt)).length)
const diaperChangesToday = computed(() => store.diaperRecords.filter(r => isToday(r.changed_dt)).length)

function formatRelative(ts: number | undefined): string {
  if (!ts) return '—'
  const diffMs = Date.now() - ts
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── History inner tab ─────────────────────────────────────────
const historyTab = ref<'diaper' | 'feeding'>('diaper')

// ── Charts ────────────────────────────────────────────────────
const dayKey = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

const last7Labels = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }),
)

const last7Keys = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }),
)

const feedingsChartData = computed(() => {
  const counts: Record<string, number> = {}
  last7Keys.value.forEach(k => (counts[k] = 0))
  store.feedingRecords.forEach(r => {
    const k = dayKey(r.created_dt)
    if (k in counts) counts[k]++
  })
  return {
    labels: last7Labels.value,
    datasets: [{
      label: 'Feedings',
      data: last7Keys.value.map(k => counts[k]),
      backgroundColor: 'rgba(64, 158, 255, 0.5)',
      borderColor: 'rgba(64, 158, 255, 1)',
      borderWidth: 1,
      borderRadius: 4,
    }],
  }
})

const diapersChartData = computed(() => {
  const counts: Record<string, number> = {}
  last7Keys.value.forEach(k => (counts[k] = 0))
  store.diaperRecords.forEach(r => {
    const k = dayKey(r.changed_dt)
    if (k in counts) counts[k]++
  })
  return {
    labels: last7Labels.value,
    datasets: [{
      label: 'Diapers',
      data: last7Keys.value.map(k => counts[k]),
      backgroundColor: 'rgba(103, 194, 58, 0.5)',
      borderColor: 'rgba(103, 194, 58, 1)',
      borderWidth: 1,
      borderRadius: 4,
    }],
  }
})

const diaperTypeChartData = computed(() => {
  let stoolOnly = 0, urineOnly = 0, both = 0, neither = 0
  store.diaperRecords.forEach(r => {
    if (r.has_stool && r.has_urine) both++
    else if (r.has_stool) stoolOnly++
    else if (r.has_urine) urineOnly++
    else neither++
  })
  const labels: string[] = ['Stool only', 'Urine only', 'Both']
  const data: number[] = [stoolOnly, urineOnly, both]
  if (neither > 0) { labels.push('Neither'); data.push(neither) }
  return {
    labels,
    datasets: [{ data, backgroundColor: ['#c8956c', '#f0c040', '#9b87d0', '#aaaaaa'] }],
  }
})

const hasDiaperData = computed(() => store.diaperRecords.length > 0)

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } },
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const } },
}

// ── Lifecycle ─────────────────────────────────────────────────
onMounted(async () => {
  await refreshApiKeyStatus()
  if (isUsable.value) {
    activeMainTab.value = 'log'
    await Promise.allSettled([store.fetchFeeding(), store.fetchDiaper()])
  } else {
    activeMainTab.value = 'api-key'
  }
})
</script>

<template>
  <div class="baby-root">

    <div class="baby-heading">
      <h1 class="baby-title">Baby Tracker</h1>
      <p class="baby-subtitle">Track feedings, diaper changes, and trends.</p>
    </div>

    <el-tabs v-model="activeMainTab" class="main-tabs">

      <!-- ── Dashboard tab ── -->
      <el-tab-pane label="Dashboard" name="dashboard">

        <el-alert v-if="!isUsable" type="info" :closable="false" show-icon class="no-key-banner">
          <template #title>
            No API key configured.
            <el-button text type="primary" size="small" @click="activeMainTab = 'api-key'">Set up in API Key tab →</el-button>
          </template>
        </el-alert>

        <template v-if="isUsable">

          <!-- Stat cards -->
          <div class="stat-cards">
            <div class="stat-card">
              <div class="stat-card-label">Last Feeding</div>
              <div class="stat-card-value">{{ formatRelative(lastFeeding?.created_dt) }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-label">Last Diaper Change</div>
              <div class="stat-card-value">{{ formatRelative(lastDiaper?.changed_dt) }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-label">Feedings Today</div>
              <div class="stat-card-value">{{ feedingsToday }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-label">Diapers Today</div>
              <div class="stat-card-value">{{ diaperChangesToday }}</div>
            </div>
          </div>

          <!-- Charts -->
          <div class="charts-grid">
            <div class="chart-card">
              <div class="chart-title">Feedings — Last 7 Days</div>
              <div class="chart-wrap">
                <Bar :data="feedingsChartData" :options="barOptions" />
              </div>
            </div>

            <div class="chart-card">
              <div class="chart-title">Diaper Changes — Last 7 Days</div>
              <div class="chart-wrap">
                <Bar :data="diapersChartData" :options="barOptions" />
              </div>
            </div>

            <div class="chart-card">
              <div class="chart-title">Diaper Type Breakdown</div>
              <div class="chart-wrap">
                <div v-if="!hasDiaperData" class="chart-empty">No diaper records yet.</div>
                <Doughnut v-else :data="diaperTypeChartData" :options="doughnutOptions" />
              </div>
            </div>
          </div>

        </template>

      </el-tab-pane>

      <!-- ── Log tab ── -->
      <el-tab-pane label="Log" name="log">

        <div v-if="!isUsable" class="no-key-notice">
          Set up your API key in the <el-button text type="primary" @click="activeMainTab = 'api-key'">API Key</el-button> tab to start logging.
        </div>

        <div v-else class="form-grid">

          <div class="form-card">
            <div class="card-title">Log a Diaper Change</div>

            <el-form label-position="top" class="diaper-form">
              <el-form-item label="Time changed">
                <el-date-picker v-model="diaperChangedAt" type="datetime" style="width: 100%"
                  :disabled-date="disableFutureDates" />
              </el-form-item>

              <el-form-item>
                <el-checkbox v-model="diaperHasStool">Stool</el-checkbox>
                <el-checkbox v-model="diaperHasUrine">Urine</el-checkbox>
              </el-form-item>

              <el-form-item v-if="diaperHasStool" label="Stool load">
                <el-select v-model="diaperStoolLoad" placeholder="Select load" style="width: 100%">
                  <el-option v-for="opt in LOAD_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>

              <el-form-item v-if="diaperHasUrine" label="Urine load">
                <el-select v-model="diaperUrineLoad" placeholder="Select load" style="width: 100%">
                  <el-option v-for="opt in LOAD_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>

              <el-button type="primary" :loading="diaperSaving" @click="handleLogDiaper">
                Log Diaper Change
              </el-button>
            </el-form>
          </div>

          <div class="form-card">
            <div class="card-title">Log a Feeding</div>

            <el-form label-position="top" class="feeding-form">
              <el-form-item label="Timing">
                <el-input v-model="feedingTiming" placeholder="e.g. 14:30 or 2:30pm" />
              </el-form-item>

              <el-form-item label="Quantity">
                <el-input v-model="feedingQty" placeholder="e.g. 120ml" />
              </el-form-item>

              <el-button type="primary" :loading="feedingSaving" @click="handleLogFeeding">
                Log Feeding
              </el-button>
            </el-form>
          </div>

        </div>

      </el-tab-pane>

      <!-- ── History tab ── -->
      <el-tab-pane label="History" name="history">

        <div v-if="!isUsable" class="no-key-notice">
          Set up your API key in the <el-button text type="primary" @click="activeMainTab = 'api-key'">API Key</el-button> tab to view history.
        </div>

        <el-tabs v-else v-model="historyTab" class="history-tabs">
          <el-tab-pane label="Diaper Changes" name="diaper">
            <el-skeleton v-if="store.isLoadingDiaper" :rows="4" animated />
            <div v-else-if="store.diaperRecords.length === 0" class="empty-state">No diaper changes logged yet.</div>
            <div v-else class="history-list">
              <div v-for="record in store.diaperRecords" :key="record.id" class="history-row">
                <div class="history-time">{{ formatDateTime(record.changed_dt) }}</div>
                <div class="history-tags">
                  <el-tag v-if="record.has_stool" :type="loadTagType(record.stool_load)">
                    Stool · {{ record.stool_load }}
                  </el-tag>
                  <el-tag v-if="record.has_urine" :type="loadTagType(record.urine_load)">
                    Urine · {{ record.urine_load }}
                  </el-tag>
                  <span v-if="!record.has_stool && !record.has_urine" class="history-empty-tag">—</span>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="Feedings" name="feeding">
            <el-skeleton v-if="store.isLoadingFeeding" :rows="4" animated />
            <div v-else-if="store.feedingRecords.length === 0" class="empty-state">No feedings logged yet.</div>
            <div v-else class="history-list">
              <div v-for="record in store.feedingRecords" :key="record.id" class="history-row">
                <div class="history-time">{{ formatDateTime(record.created_dt) }}</div>
                <div class="history-tags">
                  <el-tag type="info">{{ record.timing }}</el-tag>
                  <el-tag>{{ record.qty }}</el-tag>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>

      </el-tab-pane>

      <!-- ── API Key tab ── -->
      <el-tab-pane label="API Key" name="api-key">
        <div class="api-key-tab" v-loading="apiKeyLoading">

          <!-- Status + actions -->
          <div class="section-card">
            <div class="key-card-header">
              <span class="key-card-title">API Key Management</span>
              <el-tag v-if="isUsable" type="success" size="small" effect="plain">Active</el-tag>
              <el-tag v-else-if="keyRelinkNeeded" type="warning" size="small" effect="plain">Re-link needed</el-tag>
              <el-tag v-else type="info" size="small" effect="plain">Not configured</el-tag>
            </div>

            <template v-if="isUsable">
              <!-- One-time reveal — only shown immediately after generation -->
              <div v-if="freshlyGeneratedKey" class="fresh-key-banner">
                <div class="fresh-key-warning">
                  Copy your API key now — it will not be shown again. You must regenerate to get a new one.
                </div>
                <div class="key-reveal-row">
                  <el-input :model-value="freshlyGeneratedKey" readonly class="key-input" />
                  <el-button type="primary" :icon="CopyDocument" @click="copyAndDismiss">Copy</el-button>
                </div>
                <el-button text size="small" type="info" style="margin-top: 6px;" @click="dismissGeneratedKey">I've saved it — dismiss</el-button>
              </div>

              <p class="key-desc">
                Baby Tracker · Created {{ apiKeyStatus.createdDt ? formatDate(apiKeyStatus.createdDt) : '' }}
              </p>

              <div class="key-field-label">Key identifier</div>
              <div class="key-hint-display">ss_{{ apiKeyStatus.keyHint ?? '?????' }}…</div>

              <div class="key-actions" style="margin-top: 16px;">
                <el-button size="small" :loading="keyGenerating" @click="handleRegenerateKey">Regenerate</el-button>
                <el-button size="small" type="danger" plain :loading="keyRevoking" @click="handleRevokeKey">Revoke</el-button>
              </div>
            </template>

            <template v-else-if="keyRelinkNeeded">
              <p class="key-desc">An API key exists on the server but is not stored in this browser. Generating a new one will revoke the old key.</p>
              <el-button type="primary" :loading="keyGenerating" @click="handleGenerateKey">Generate New Key</el-button>
            </template>

            <template v-else>
              <p class="key-desc">Generate an API key to enable tracking from this app and Siri Shortcuts.</p>
              <el-button type="primary" :loading="keyGenerating" @click="handleGenerateKey">Generate API Key</el-button>
            </template>
          </div>

          <!-- Siri Shortcuts guide -->
          <div class="siri-guide">
            <div class="siri-guide-title">Using with Siri Shortcuts</div>
            <ol class="siri-steps">
              <li>Open the Shortcuts app and open (or create) your shortcut</li>
              <li>Add a <strong>Get Contents of URL</strong> action</li>
              <li>Set <strong>Method</strong> to <code>POST</code> and <strong>Request Body</strong> to <code>JSON</code></li>
              <li>Under <strong>Headers</strong>, add: <code>X-API-Key</code> → <em>paste your key</em></li>
              <li>Set the URL to one of the endpoints below</li>
            </ol>

            <div class="siri-endpoints">
              <div class="endpoint-title">Endpoints</div>
              <div class="endpoint-row">
                <span class="endpoint-method">POST</span>
                <code class="endpoint-path">{{ serverBaseUrl }}/v1/ss/baby/feeding</code>
              </div>
              <div class="endpoint-body">Body: <code>{{ '{ "timing": "14:30", "qty": "120ml" }' }}</code></div>

              <div class="endpoint-row" style="margin-top: 10px;">
                <span class="endpoint-method">POST</span>
                <code class="endpoint-path">{{ serverBaseUrl }}/v1/ss/baby/diaper</code>
              </div>
              <div class="endpoint-body">
                Body: <code>{{ '{ "changedAt": <ms timestamp>, "hasStool": true, "hasUrine": false, "stoolLoad": "medium", "urineLoad": null }' }}</code>
              </div>
            </div>
          </div>

        </div>
      </el-tab-pane>

    </el-tabs>

  </div>
</template>

<style scoped>
.baby-root {
  max-width: 960px;
  width: 100%;
  justify-self: center;
  padding-bottom: 48px;
}

.baby-heading {
  padding: 24px 0 20px;
}

.baby-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 4px;
}

.baby-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
  margin: 0;
}

.main-tabs {
  --el-tabs-header-height: 40px;
}

/* API Key card */
.section-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
}

.key-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.key-card-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
}

.key-desc {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.6;
  margin: 0 0 12px;
  line-height: 1.5;
}

.key-actions {
  display: flex;
  gap: 8px;
}

/* Stat cards */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 16px;
}

.stat-card-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
  margin-bottom: 6px;
}

.stat-card-value {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--color-heading);
}

/* Charts */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 8px;
}

.chart-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 16px 16px 12px;
}

.chart-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.55;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.chart-wrap {
  height: 180px;
  position: relative;
}

.chart-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.4;
}

/* Log forms */
.no-key-notice {
  padding: 32px 0;
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-text);
  opacity: 0.6;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding-top: 4px;
}

.form-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 20px;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 14px;
}

/* History */
.history-tabs {
  padding-top: 4px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--color-border);
}

.history-row:last-child {
  border-bottom: none;
}

.history-time {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.7;
  flex-shrink: 0;
}

.history-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.history-empty-tag {
  font-size: 0.8rem;
  opacity: 0.4;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--color-text);
  opacity: 0.5;
  font-size: 0.85rem;
}

/* API Key tab */
.api-key-tab {
  padding-top: 4px;
  max-width: 640px;
}

.no-key-banner {
  margin-bottom: 16px;
}

.key-field-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
  margin-bottom: 6px;
}

.key-hint-display {
  font-family: monospace;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-heading);
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

/* One-time reveal banner */
.fresh-key-banner {
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-5);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.fresh-key-warning {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--el-color-warning-dark-2);
  margin-bottom: 10px;
  line-height: 1.4;
}

.key-reveal-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.key-input {
  font-family: monospace;
  flex: 1;
}

/* Siri Shortcuts guide */
.siri-guide {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 20px;
  margin-top: 16px;
}

.siri-guide-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 12px;
}

.siri-steps {
  margin: 0 0 16px 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.siri-steps li {
  font-size: 0.83rem;
  color: var(--color-text);
  line-height: 1.5;
}

.siri-steps code {
  background: var(--color-background-mute);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 0.8rem;
}

.siri-endpoints {
  border-top: 1px solid var(--color-border);
  padding-top: 14px;
}

.endpoint-title {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.45;
  margin-bottom: 8px;
}

.endpoint-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.endpoint-method {
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-radius: 4px;
  padding: 2px 6px;
  flex-shrink: 0;
}

.endpoint-path {
  font-size: 0.78rem;
  word-break: break-all;
}

.endpoint-body {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.6;
  margin-top: 4px;
  padding-left: 4px;
  word-break: break-all;
}

.endpoint-body code {
  background: var(--color-background-mute);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 0.75rem;
}

/* Mobile */
@media (max-width: 820px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
