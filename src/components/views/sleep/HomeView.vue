<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  Filler, Tooltip, Legend,
} from 'chart.js'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { ElMessage } from 'element-plus'
import { useAuthenticationStore } from '@/stores/authentication'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Tooltip, Legend)

interface SleepLog {
  id: number
  date: string
  source: string
  bedtime: string | null
  wakeTime: string | null
  totalSleepMin: number | null
  deepMin: number | null
  lightMin: number | null
  remMin: number | null
  awakeMin: number | null
  deepPct: number | null
  lightPct: number | null
  remPct: number | null
  restingHrBpm: number | null
  bodyBatteryChange: number | null
  avgSpo2Pct: number | null
  lowestSpo2Pct: number | null
  avgRespirationBrpm: number | null
  lowestRespirationBrpm: number | null
  notes: string | null
  createdAt: number
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

const mainTab = ref('dashboard')
const dashTab = ref('overview')

// ── State ────────────────────────────────────────────────────────────────────

const loading = ref(false)
const logs = ref<SleepLog[]>([])

const showAddDialog = ref(false)
const showImportDialog = ref(false)
const editingLog = ref<SleepLog | null>(null)

const importJson = ref('')
const importParsed = ref<any[] | null>(null)
const importError = ref('')
const importLoading = ref(false)

const authStore = useAuthenticationStore()
const featureFlags = ref<Record<string, boolean>>({})

const canParseScreenshot = computed(() => {
  const roles = authStore.userProfile.roles
  const hasRole = roles.includes('SLP_R5') || roles.includes('SYSTEM_R5')
  return hasRole && (featureFlags.value['sleep_screenshot_parsing'] === true)
})

const screenshotInput = ref<HTMLInputElement | null>(null)
const screenshotLoading = ref(false)
const parsedEntries = ref<Record<string, any>[]>([])
const showParsedDialog = ref(false)

const blankForm = (): Record<string, any> => ({
  date: '', source: 'garmin',
  bedtime: '', wakeTime: '',
  totalSleepMin: null, deepMin: null, lightMin: null, remMin: null, awakeMin: null,
  deepPct: null, lightPct: null, remPct: null,
  restingHrBpm: null, bodyBatteryChange: null,
  avgSpo2Pct: null, lowestSpo2Pct: null,
  avgRespirationBrpm: null, lowestRespirationBrpm: null,
  notes: '',
})
const form = ref(blankForm())

// ── Fetch ────────────────────────────────────────────────────────────────────

onMounted(async () => {
  loading.value = true
  try {
    const [logsRes, flagsRes] = await Promise.allSettled([
      HttpClient.get(ApiRoute.SLEEP.GET_ALL),
      HttpClient.get(ApiRoute.FEATURE.GET_ALL),
    ])
    if (logsRes.status === 'fulfilled') logs.value = logsRes.value.data.data.logs ?? []
    else ElMessage.error('Failed to load sleep logs')
    if (flagsRes.status === 'fulfilled') featureFlags.value = flagsRes.value.data.data ?? {}
  } finally {
    loading.value = false
  }
})

// ── Computed stats (logs tab) ─────────────────────────────────────────────────

const logsWithSpo2 = computed(() => logs.value.filter(l => l.lowestSpo2Pct !== null))
const spo2AlertCount = computed(() => logsWithSpo2.value.filter(l => (l.lowestSpo2Pct ?? 100) < 90).length)
const worstSpo2 = computed(() => {
  if (!logsWithSpo2.value.length) return null
  return Math.min(...logsWithSpo2.value.map(l => l.lowestSpo2Pct!))
})

const logsWithSleep = computed(() => logs.value.filter(l => l.totalSleepMin !== null))
const avgSleepMin = computed(() => {
  if (!logsWithSleep.value.length) return null
  return Math.round(logsWithSleep.value.reduce((s, l) => s + l.totalSleepMin!, 0) / logsWithSleep.value.length)
})

const logsWithBattery = computed(() => logs.value.filter(l => l.bodyBatteryChange !== null))
const avgBattery = computed(() => {
  if (!logsWithBattery.value.length) return null
  return Math.round(logsWithBattery.value.reduce((s, l) => s + l.bodyBatteryChange!, 0) / logsWithBattery.value.length)
})

// ── Dashboard computed ────────────────────────────────────────────────────────

const dashLogs = computed(() => logs.value.slice().sort((a, b) => a.date.localeCompare(b.date)))
const dashLabels = computed(() => dashLogs.value.map(d => d.date.slice(5)))

// Overview stats
const dashAvgSleep = computed(() => {
  const v = dashLogs.value.filter(d => d.totalSleepMin !== null)
  return v.length ? Math.round(v.reduce((s, d) => s + d.totalSleepMin!, 0) / v.length) : null
})
const dashLowestSpo2 = computed(() => {
  const v = dashLogs.value.filter(d => d.lowestSpo2Pct !== null)
  return v.length ? Math.min(...v.map(d => d.lowestSpo2Pct!)) : null
})
const dashSpo2AlertNights = computed(() => dashLogs.value.filter(d => d.lowestSpo2Pct !== null && d.lowestSpo2Pct < 90).length)
const dashSpo2TotalNights = computed(() => dashLogs.value.filter(d => d.lowestSpo2Pct !== null).length)
const dashAvgRemPct = computed(() => {
  const v = dashLogs.value.filter(d => d.remPct !== null)
  return v.length ? Math.round(v.reduce((s, d) => s + d.remPct!, 0) / v.length) : null
})
const dashAvgBb = computed(() => {
  const v = dashLogs.value.filter(d => d.bodyBatteryChange !== null)
  return v.length ? Math.round(v.reduce((s, d) => s + d.bodyBatteryChange!, 0) / v.length) : null
})
const dashAvgDeepPct = computed(() => {
  const v = dashLogs.value.filter(d => d.deepPct !== null)
  return v.length ? Math.round(v.reduce((s, d) => s + d.deepPct!, 0) / v.length) : null
})
const dashAvgRhr = computed(() => {
  const v = dashLogs.value.filter(d => d.restingHrBpm !== null)
  return v.length ? Math.round(v.reduce((s, d) => s + d.restingHrBpm!, 0) / v.length) : null
})
const dashAvgBedtimeMin = computed(() => {
  const v = dashLogs.value.filter(d => d.bedtime !== null)
  return v.length ? Math.round(v.reduce((s, d) => s + bedtimeToMin(d.bedtime)!, 0) / v.length) : null
})

// Key findings
const dashFindings = computed(() => {
  const f: { type: 'critical' | 'warn' | 'good'; text: string }[] = []
  if (dashSpo2AlertNights.value > 0) {
    f.push({ type: 'critical', text: `SpO₂ below 90% on ${dashSpo2AlertNights.value}/${dashSpo2TotalNights.value} Garmin nights — consistent with sleep-disordered breathing` })
  }
  if (dashAvgDeepPct.value !== null) {
    if (dashAvgDeepPct.value < 13) f.push({ type: 'warn', text: `Avg deep sleep ${dashAvgDeepPct.value}% — below healthy range of 13–23%` })
    else f.push({ type: 'good', text: `Avg deep sleep ${dashAvgDeepPct.value}% — within healthy range` })
  }
  if (dashAvgRemPct.value !== null) {
    if (dashAvgRemPct.value < 20) f.push({ type: 'warn', text: `Avg REM ${dashAvgRemPct.value}% — below healthy 20–25% range` })
    else f.push({ type: 'good', text: `Avg REM ${dashAvgRemPct.value}% — healthy cognitive recovery range` })
  }
  if (dashAvgRhr.value !== null && dashAvgRhr.value < 60) {
    f.push({ type: 'good', text: `Avg RHR ${dashAvgRhr.value} bpm — strong cardiovascular baseline` })
  }
  if (dashAvgBedtimeMin.value !== null && dashAvgBedtimeMin.value > 60) {
    f.push({ type: 'warn', text: `Avg bedtime ${bedtimeLabel(dashAvgBedtimeMin.value)} — shifted late, goal is before midnight` })
  }
  return f
})

// Sleep Stages stats
const bestRemEntry = computed(() => {
  const v = dashLogs.value.filter(d => d.remMin !== null)
  return v.length ? v.reduce((b, d) => d.remMin! > b.remMin! ? d : b) : null
})
const worstRemEntry = computed(() => {
  const v = dashLogs.value.filter(d => d.remMin !== null)
  return v.length ? v.reduce((b, d) => d.remMin! < b.remMin! ? d : b) : null
})
const bestDeepEntry = computed(() => {
  const v = dashLogs.value.filter(d => d.deepMin !== null)
  return v.length ? v.reduce((b, d) => d.deepMin! > b.deepMin! ? d : b) : null
})

// Recovery stats
const bestBbEntry = computed(() => {
  const v = dashLogs.value.filter(d => d.bodyBatteryChange !== null)
  return v.length ? v.reduce((b, d) => d.bodyBatteryChange! > b.bodyBatteryChange! ? d : b) : null
})
const worstBbEntry = computed(() => {
  const v = dashLogs.value.filter(d => d.bodyBatteryChange !== null)
  return v.length ? v.reduce((b, d) => d.bodyBatteryChange! < b.bodyBatteryChange! ? d : b) : null
})

// Bedtime stats
const earliestBedtimeEntry = computed(() => {
  const v = dashLogs.value.filter(d => d.bedtime !== null)
  return v.length ? v.reduce((b, d) => bedtimeToMin(d.bedtime)! < bedtimeToMin(b.bedtime)! ? d : b) : null
})
const latestBedtimeEntry = computed(() => {
  const v = dashLogs.value.filter(d => d.bedtime !== null)
  return v.length ? v.reduce((b, d) => bedtimeToMin(d.bedtime)! > bedtimeToMin(b.bedtime)! ? d : b) : null
})
const sub1amNights = computed(() => dashLogs.value.filter(d => d.bedtime && bedtimeToMin(d.bedtime)! <= 60).length)

// SpO₂ distribution
const spo2Dist = computed(() => [
  { label: '≥ 93% (Normal)',       count: dashLogs.value.filter(d => d.lowestSpo2Pct !== null && d.lowestSpo2Pct >= 93).length, color: '#34d399' },
  { label: '90–92% (Borderline)',  count: dashLogs.value.filter(d => d.lowestSpo2Pct !== null && d.lowestSpo2Pct >= 90 && d.lowestSpo2Pct < 93).length, color: '#f59e0b' },
  { label: '85–89% (Concerning)',  count: dashLogs.value.filter(d => d.lowestSpo2Pct !== null && d.lowestSpo2Pct >= 85 && d.lowestSpo2Pct < 90).length, color: '#f97316' },
  { label: '< 85% (Critical)',     count: dashLogs.value.filter(d => d.lowestSpo2Pct !== null && d.lowestSpo2Pct < 85).length, color: '#ef4444' },
])

// ── Chart datasets ────────────────────────────────────────────────────────────

const totalSleepChartData = computed(() => ({
  labels: dashLabels.value,
  datasets: [{
    data: dashLogs.value.map(d => d.totalSleepMin),
    backgroundColor: dashLogs.value.map(d =>
      !d.totalSleepMin ? '#444' :
      d.totalSleepMin >= 420 ? '#3b82f6' :
      d.totalSleepMin >= 360 ? '#f59e0b' : '#ef4444'
    ),
    borderRadius: 4,
  }],
}))

const spo2BarChartData = computed(() => {
  const filtered = dashLogs.value.filter(d => d.lowestSpo2Pct !== null)
  return {
    labels: filtered.map(d => d.date.slice(5)),
    datasets: [{
      data: filtered.map(d => d.lowestSpo2Pct),
      backgroundColor: filtered.map(d =>
        (d.lowestSpo2Pct ?? 100) < 85 ? '#dc2626' :
        (d.lowestSpo2Pct ?? 100) < 90 ? '#ef4444' :
        (d.lowestSpo2Pct ?? 100) < 93 ? '#f59e0b' : '#34d399'
      ),
      borderRadius: 4,
    }],
  }
})

const spo2LineChartData = computed(() => {
  const filtered = dashLogs.value.filter(d => d.avgSpo2Pct !== null)
  return {
    labels: filtered.map(d => d.date.slice(5)),
    datasets: [
      {
        label: 'Avg SpO₂',
        data: filtered.map(d => d.avgSpo2Pct),
        borderColor: '#60a5fa',
        backgroundColor: '#60a5fa20',
        pointRadius: 3,
        tension: 0.3,
      },
      {
        label: 'Lowest SpO₂',
        data: filtered.map(d => d.lowestSpo2Pct),
        borderColor: '#ef4444',
        backgroundColor: '#ef444420',
        borderDash: [4, 2],
        pointRadius: 3,
        tension: 0.3,
      },
    ],
  }
})

const stagesStackedChartData = computed(() => ({
  labels: dashLabels.value,
  datasets: [
    { label: 'Deep',  data: dashLogs.value.map(d => d.deepPct),  backgroundColor: '#1d4ed8' },
    { label: 'REM',   data: dashLogs.value.map(d => d.remPct),   backgroundColor: '#c084fc' },
    { label: 'Light', data: dashLogs.value.map(d => d.lightPct), backgroundColor: '#38bdf8' },
  ],
}))

const remAreaChartData = computed(() => ({
  labels: dashLabels.value,
  datasets: [{
    label: 'REM',
    data: dashLogs.value.map(d => d.remMin),
    borderColor: '#c084fc',
    backgroundColor: 'rgba(192,132,252,0.15)',
    fill: true,
    pointRadius: 3,
    tension: 0.3,
  }],
}))

const bbBarChartData = computed(() => {
  const filtered = dashLogs.value.filter(d => d.bodyBatteryChange !== null)
  return {
    labels: filtered.map(d => d.date.slice(5)),
    datasets: [{
      data: filtered.map(d => d.bodyBatteryChange),
      backgroundColor: filtered.map(d =>
        (d.bodyBatteryChange ?? 0) >= 70 ? '#34d399' :
        (d.bodyBatteryChange ?? 0) >= 55 ? '#f59e0b' : '#ef4444'
      ),
      borderRadius: 4,
    }],
  }
})

const rhrLineChartData = computed(() => {
  const filtered = dashLogs.value.filter(d => d.restingHrBpm !== null)
  return {
    labels: filtered.map(d => d.date.slice(5)),
    datasets: [{
      label: 'RHR',
      data: filtered.map(d => d.restingHrBpm),
      borderColor: '#f87171',
      backgroundColor: 'rgba(248,113,113,0.12)',
      fill: true,
      pointRadius: 3,
      tension: 0.3,
    }],
  }
})

const bedtimeAreaChartData = computed(() => ({
  labels: dashLabels.value,
  datasets: [{
    label: 'Bedtime',
    data: dashLogs.value.map(d => bedtimeToMin(d.bedtime)),
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245,158,11,0.1)',
    fill: true,
    pointRadius: 3,
    tension: 0.3,
  }],
}))

// ── Chart options ─────────────────────────────────────────────────────────────

const baseScales = {
  x: {
    grid: { color: '#1e2130' },
    ticks: { color: '#555c7a', font: { size: 11 } },
    border: { display: false },
  },
  y: {
    grid: { color: '#1e2130' },
    ticks: { color: '#555c7a', font: { size: 11 } },
    border: { display: false },
  },
}

function baseOpts(extra: Record<string, any> = {}): any {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f1117', borderColor: '#2a2d3a', borderWidth: 1, titleColor: '#8b8fa8', bodyColor: '#e2e8f0' } },
    scales: baseScales,
    ...extra,
  }
}

const totalSleepOpts = baseOpts({ scales: { ...baseScales, y: { ...baseScales.y, ticks: { ...baseScales.y.ticks, callback: (v: number) => `${Math.floor(v / 60)}h` }, min: 0 } } })
const spo2BarOpts     = baseOpts({ scales: { ...baseScales, y: { ...baseScales.y, min: 75, max: 100, ticks: { ...baseScales.y.ticks, callback: (v: number) => `${v}%` } } } })
const spo2LineOpts    = { ...baseOpts(), plugins: { ...baseOpts().plugins, legend: { display: true, labels: { color: '#8b8fa8', font: { size: 11 } } } }, scales: { ...baseScales, y: { ...baseScales.y, min: 75, max: 100, ticks: { ...baseScales.y.ticks, callback: (v: number) => `${v}%` } } } }
const stagesOpts      = baseOpts({ scales: { x: { ...baseScales.x, stacked: true }, y: { ...baseScales.y, stacked: true, min: 0, max: 100, ticks: { ...baseScales.y.ticks, callback: (v: number) => `${v}%` } } } })
const remAreaOpts     = baseOpts()
const bbBarOpts       = baseOpts()
const rhrLineOpts     = baseOpts({ scales: { ...baseScales, y: { ...baseScales.y, ticks: { ...baseScales.y.ticks, callback: (v: number) => `${v} bpm` } } } })
const bedtimeAreaOpts = baseOpts({ scales: { ...baseScales, y: { ...baseScales.y, ticks: { ...baseScales.y.ticks, callback: (v: number) => bedtimeLabel(v) } } } })

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function sleepDurationClass(min: number | null): string {
  if (min === null) return ''
  if (min < 300) return 'dur--critical'
  if (min < 360) return 'dur--warn'
  if (min < 420) return 'dur--ok'
  return 'dur--good'
}

function spo2Class(val: number | null): string {
  if (val === null) return ''
  if (val < 88) return 'spo2--critical'
  if (val < 90) return 'spo2--warn'
  return 'spo2--ok'
}

function bedtimeToMin(t: string | null): number | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  const total = h * 60 + m
  return total > 780 ? total - 1440 : total
}

function bedtimeLabel(min: number | null): string {
  if (min === null) return '—'
  const actual = min < 0 ? 1440 + min : min
  const h = Math.floor(actual / 60)
  const m = actual % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function bedtimeColor(min: number | null): string {
  if (min === null) return '#555c7a'
  if (min < 0) return '#34d399'
  if (min <= 60) return '#60a5fa'
  if (min <= 160) return '#f59e0b'
  return '#ef4444'
}

function bedtimeBarWidth(min: number | null): string {
  if (min === null) return '5%'
  return `${Math.min(100, Math.max(5, ((min + 60) / 400) * 100))}%`
}

function stageSegments(log: SleepLog): { label: string; pct: number; color: string }[] {
  const total = log.totalSleepMin
  if (!total) return []
  const segs = []
  if (log.deepMin)  segs.push({ label: 'Deep',  pct: Math.round((log.deepMin  / total) * 100), color: '#6366f1' })
  if (log.remMin)   segs.push({ label: 'REM',   pct: Math.round((log.remMin   / total) * 100), color: '#ec4899' })
  if (log.lightMin) segs.push({ label: 'Light', pct: Math.round((log.lightMin / total) * 100), color: '#94a3b8' })
  if (log.awakeMin) segs.push({ label: 'Awake', pct: Math.round((log.awakeMin / total) * 100), color: '#e2e8f0' })
  return segs
}

// ── Add / Edit ────────────────────────────────────────────────────────────────

function openAdd() {
  editingLog.value = null
  form.value = blankForm()
  showAddDialog.value = true
}

function openEdit(log: SleepLog) {
  editingLog.value = log
  form.value = {
    date: log.date, source: log.source,
    bedtime: log.bedtime ?? '', wakeTime: log.wakeTime ?? '',
    totalSleepMin: log.totalSleepMin, deepMin: log.deepMin, lightMin: log.lightMin,
    remMin: log.remMin, awakeMin: log.awakeMin,
    deepPct: log.deepPct, lightPct: log.lightPct, remPct: log.remPct,
    restingHrBpm: log.restingHrBpm, bodyBatteryChange: log.bodyBatteryChange,
    avgSpo2Pct: log.avgSpo2Pct, lowestSpo2Pct: log.lowestSpo2Pct,
    avgRespirationBrpm: log.avgRespirationBrpm, lowestRespirationBrpm: log.lowestRespirationBrpm,
    notes: log.notes ?? '',
  }
  showAddDialog.value = true
}

function toSnake(f: Record<string, any>) {
  return {
    date:                    f.date,
    source:                  f.source,
    bedtime:                 f.bedtime || null,
    wake_time:               f.wakeTime || null,
    total_sleep_min:         f.totalSleepMin ?? null,
    deep_min:                f.deepMin ?? null,
    light_min:               f.lightMin ?? null,
    rem_min:                 f.remMin ?? null,
    awake_min:               f.awakeMin ?? null,
    deep_pct:                f.deepPct ?? null,
    light_pct:               f.lightPct ?? null,
    rem_pct:                 f.remPct ?? null,
    resting_hr_bpm:          f.restingHrBpm ?? null,
    body_battery_change:     f.bodyBatteryChange ?? null,
    avg_spo2_pct:            f.avgSpo2Pct ?? null,
    lowest_spo2_pct:         f.lowestSpo2Pct ?? null,
    avg_respiration_brpm:    f.avgRespirationBrpm ?? null,
    lowest_respiration_brpm: f.lowestRespirationBrpm ?? null,
    notes:                   f.notes || null,
  }
}

async function saveLog() {
  if (!form.value.date || !form.value.source) return
  try {
    if (editingLog.value) {
      const { data } = await HttpClient.post(ApiRoute.SLEEP.UPDATE, { id: editingLog.value.id, ...toSnake(form.value) })
      const idx = logs.value.findIndex(l => l.id === editingLog.value!.id)
      if (idx !== -1) logs.value[idx] = data.data.log
    } else {
      const { data } = await HttpClient.post(ApiRoute.SLEEP.CREATE, toSnake(form.value))
      logs.value.unshift(data.data.log)
      logs.value.sort((a, b) => b.date.localeCompare(a.date))
    }
    showAddDialog.value = false
  } catch {
    ElMessage.error('Failed to save log')
  }
}

async function deleteLog(id: number) {
  try {
    await HttpClient.post(ApiRoute.SLEEP.DELETE, { id })
    logs.value = logs.value.filter(l => l.id !== id)
  } catch {
    ElMessage.error('Failed to delete log')
  }
}

// ── JSON Import ───────────────────────────────────────────────────────────────

function parseImportJson() {
  importError.value = ''
  importParsed.value = null
  try {
    const parsed = JSON.parse(importJson.value.trim())
    const arr: any[] = Array.isArray(parsed)
      ? parsed
      : parsed.sleep_dataset ?? parsed.entries ?? null
    if (!Array.isArray(arr)) throw new Error('Expected an array or object with sleep_dataset key')
    if (!arr.every(e => e.date)) throw new Error('Each entry must have a "date" field')
    importParsed.value = arr
  } catch (e: any) {
    importError.value = e.message ?? 'Invalid JSON'
  }
}

async function confirmImport() {
  if (!importParsed.value) return
  importLoading.value = true
  try {
    await HttpClient.post(ApiRoute.SLEEP.BULK, { entries: importParsed.value })
    const { data } = await HttpClient.get(ApiRoute.SLEEP.GET_ALL)
    logs.value = data.data.logs ?? []
    const importCount = importParsed.value.length
    showImportDialog.value = false
    importJson.value = ''
    importParsed.value = null
    ElMessage.success(`Imported ${importCount} entries`)
  } catch {
    ElMessage.error('Import failed')
  } finally {
    importLoading.value = false
  }
}

// ── Screenshot parsing ────────────────────────────────────────────────────────

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function handleScreenshots(event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (!files?.length) return
  screenshotLoading.value = true

  const merged: Record<string, Record<string, any>> = {}

  for (const file of Array.from(files)) {
    try {
      const base64 = await readFileAsBase64(file)
      const { data } = await HttpClient.post(ApiRoute.SLEEP.PARSE_SCREENSHOT, {
        image: base64,
        mimeType: file.type || 'image/jpeg',
      })
      const parsed = data.data.parsed as Record<string, any>
      const date = (parsed.date as string) ?? 'unknown'
      if (!merged[date]) {
        merged[date] = { ...parsed }
      } else {
        for (const key of Object.keys(parsed)) {
          if ((merged[date][key] === null || merged[date][key] === undefined) && parsed[key] !== null) {
            merged[date][key] = parsed[key]
          }
        }
      }
    } catch {
      ElMessage.error(`Failed to parse ${file.name}`)
    }
  }

  parsedEntries.value = Object.values(merged)
  if (parsedEntries.value.length) showParsedDialog.value = true
  screenshotLoading.value = false

  if (screenshotInput.value) screenshotInput.value.value = ''
}

function removeParsedEntry(idx: number) {
  parsedEntries.value.splice(idx, 1)
}

async function confirmParsedImport() {
  if (!parsedEntries.value.length) return
  importLoading.value = true
  try {
    await HttpClient.post(ApiRoute.SLEEP.BULK, { entries: parsedEntries.value })
    const { data } = await HttpClient.get(ApiRoute.SLEEP.GET_ALL)
    logs.value = data.data.logs ?? []
    ElMessage.success(`Imported ${parsedEntries.value.length} entries`)
    showParsedDialog.value = false
    parsedEntries.value = []
    mainTab.value = 'logs'
  } catch {
    ElMessage.error('Import failed')
  } finally {
    importLoading.value = false
  }
}
</script>

<template>
  <div class="sleep-page page-container" v-loading="loading || screenshotLoading">

    <!-- Header -->
    <div class="sleep-header">
      <div>
        <h1 class="sleep-title">Sleep Tracker</h1>
        <p class="sleep-subtitle">{{ logs.length }} nights logged</p>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="showImportDialog = true">⬆ Import JSON</el-button>
        <el-button v-if="canParseScreenshot" size="small" :loading="screenshotLoading" @click="screenshotInput?.click()">📷 Parse Screenshot</el-button>
        <el-button type="primary" size="small" @click="openAdd">+ Add Night</el-button>
        <input ref="screenshotInput" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden @change="handleScreenshots" />
      </div>
    </div>

    <!-- Main tabs -->
    <el-tabs v-model="mainTab" class="sleep-main-tabs">

      <!-- ── DASHBOARD TAB ─────────────────────────────────────────── -->
      <el-tab-pane label="Dashboard" name="dashboard">
        <div v-if="logs.length === 0" class="empty-state">No sleep logs yet. Add a night or import your dataset.</div>
        <template v-else>
          <!-- Alert banner -->
          <div v-if="dashSpo2AlertNights > 0" class="dash-alert-banner">
            ⚠️
            <div>
              <p class="dash-alert-title">SpO₂ Alert — Medical Review Recommended</p>
              <p class="dash-alert-body">
                {{ dashSpo2AlertNights }} of {{ dashSpo2TotalNights }} Garmin nights recorded lowest SpO₂ below 90%.
                Lowest recorded: {{ dashLowestSpo2 }}%. This pattern warrants a sleep study / ENT consultation.
              </p>
            </div>
          </div>

          <!-- Inner tabs -->
          <el-tabs v-model="dashTab" class="dash-inner-tabs">

            <!-- OVERVIEW -->
            <el-tab-pane label="Overview" name="overview">
              <div class="dash-stat-grid">
                <div class="dash-stat">
                  <span class="dash-stat-label">Avg Sleep</span>
                  <span class="dash-stat-value">{{ dashAvgSleep ? fmtDuration(dashAvgSleep) : '—' }}</span>
                  <span class="dash-stat-sub">Target: 7h+</span>
                </div>
                <div class="dash-stat dash-stat--alert">
                  <span class="dash-stat-label">Lowest SpO₂</span>
                  <span class="dash-stat-value" style="color:#ef4444">{{ dashLowestSpo2 !== null ? `${dashLowestSpo2}%` : '—' }}</span>
                  <span class="dash-stat-sub">{{ dashSpo2AlertNights }} nights &lt;90%</span>
                </div>
                <div class="dash-stat">
                  <span class="dash-stat-label">Avg REM</span>
                  <span class="dash-stat-value" style="color:#c084fc">{{ dashAvgRemPct !== null ? `${dashAvgRemPct}%` : '—' }}</span>
                  <span class="dash-stat-sub">Healthy: 20–25%</span>
                </div>
                <div class="dash-stat">
                  <span class="dash-stat-label">Avg Body Battery</span>
                  <span class="dash-stat-value" style="color:#34d399">{{ dashAvgBb !== null ? `+${dashAvgBb}` : '—' }}</span>
                  <span class="dash-stat-sub">Good recovery signal</span>
                </div>
              </div>

              <div class="dash-chart-card">
                <p class="dash-chart-label">TOTAL SLEEP PER NIGHT</p>
                <div class="dash-chart-wrap">
                  <Bar :data="totalSleepChartData" :options="totalSleepOpts" />
                </div>
              </div>

              <div class="dash-chart-card">
                <p class="dash-chart-label">KEY FINDINGS</p>
                <div v-for="(f, i) in dashFindings" :key="i" class="dash-finding">
                  <span class="dash-finding-dot" :class="`dash-finding-dot--${f.type}`" />
                  <span class="dash-finding-text">{{ f.text }}</span>
                </div>
                <div v-if="!dashFindings.length" class="dash-finding-empty">Not enough data to generate findings.</div>
              </div>
            </el-tab-pane>

            <!-- SPO2 -->
            <el-tab-pane label="SpO₂" name="spo2">
              <div class="dash-chart-card">
                <p class="dash-chart-label">LOWEST SpO₂ PER NIGHT</p>
                <p class="dash-chart-hint">Below 90% is clinically significant</p>
                <div class="dash-chart-wrap">
                  <Bar :data="spo2BarChartData" :options="spo2BarOpts" />
                </div>
              </div>

              <div class="dash-chart-card">
                <p class="dash-chart-label">AVG vs LOWEST SpO₂</p>
                <div class="dash-chart-wrap">
                  <Line :data="spo2LineChartData" :options="spo2LineOpts" />
                </div>
              </div>

              <div class="dash-chart-card">
                <p class="dash-chart-label">SpO₂ DISTRIBUTION</p>
                <div v-for="item in spo2Dist" :key="item.label" class="dist-row">
                  <span class="dist-dot" :style="{ background: item.color }" />
                  <span class="dist-label">{{ item.label }}</span>
                  <span class="dist-count" :style="{ color: item.color }">{{ item.count }} nights</span>
                  <div class="dist-bar-bg">
                    <div class="dist-bar-fill" :style="{ width: `${(item.count / Math.max(dashSpo2TotalNights, 1)) * 100}%`, background: item.color }" />
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <!-- SLEEP STAGES -->
            <el-tab-pane label="Sleep Stages" name="stages">
              <div class="dash-chart-card">
                <p class="dash-chart-label">STAGE COMPOSITION (Deep · REM · Light)</p>
                <div class="dash-chart-wrap">
                  <Bar :data="stagesStackedChartData" :options="stagesOpts" />
                </div>
                <div class="stages-legend">
                  <span v-for="([l, c]) in [['Deep','#1d4ed8'],['REM','#c084fc'],['Light','#38bdf8']]" :key="l" class="stages-legend-item">
                    <span class="stages-legend-dot" :style="{ background: c }" />{{ l }}
                  </span>
                </div>
              </div>

              <div class="dash-chart-card">
                <p class="dash-chart-label">REM MINUTES TREND</p>
                <div class="dash-chart-wrap">
                  <Line :data="remAreaChartData" :options="remAreaOpts" />
                </div>
              </div>

              <div class="dash-stat-grid">
                <div class="dash-stat">
                  <span class="dash-stat-label">Best REM Night</span>
                  <span class="dash-stat-value" style="color:#c084fc">{{ bestRemEntry?.date ?? '—' }}</span>
                  <span class="dash-stat-sub" v-if="bestRemEntry">{{ bestRemEntry.remMin }}m · {{ bestRemEntry.remPct }}%</span>
                </div>
                <div class="dash-stat">
                  <span class="dash-stat-label">Worst REM Night</span>
                  <span class="dash-stat-value" style="color:#f59e0b">{{ worstRemEntry?.date ?? '—' }}</span>
                  <span class="dash-stat-sub" v-if="worstRemEntry">{{ worstRemEntry.remMin }}m · {{ worstRemEntry.remPct }}%</span>
                </div>
                <div class="dash-stat">
                  <span class="dash-stat-label">Best Deep Night</span>
                  <span class="dash-stat-value" style="color:#3b82f6">{{ bestDeepEntry?.date ?? '—' }}</span>
                  <span class="dash-stat-sub" v-if="bestDeepEntry">{{ bestDeepEntry.deepMin }}m · {{ bestDeepEntry.deepPct }}%</span>
                </div>
                <div class="dash-stat">
                  <span class="dash-stat-label">Avg Deep %</span>
                  <span class="dash-stat-value">{{ dashAvgDeepPct !== null ? `${dashAvgDeepPct}%` : '—' }}</span>
                  <span class="dash-stat-sub">Healthy: 13–23%</span>
                </div>
              </div>
            </el-tab-pane>

            <!-- RECOVERY -->
            <el-tab-pane label="Recovery" name="recovery">
              <div class="dash-chart-card">
                <p class="dash-chart-label">BODY BATTERY CHANGE</p>
                <div class="dash-chart-wrap">
                  <Bar :data="bbBarChartData" :options="bbBarOpts" />
                </div>
              </div>

              <div class="dash-chart-card">
                <p class="dash-chart-label">RESTING HEART RATE</p>
                <div class="dash-chart-wrap" style="height:160px">
                  <Line :data="rhrLineChartData" :options="rhrLineOpts" />
                </div>
              </div>

              <div class="dash-stat-grid">
                <div class="dash-stat">
                  <span class="dash-stat-label">Best Recovery</span>
                  <span class="dash-stat-value" style="color:#34d399">{{ bestBbEntry?.date ?? '—' }}</span>
                  <span class="dash-stat-sub" v-if="bestBbEntry">+{{ bestBbEntry.bodyBatteryChange }} body battery</span>
                </div>
                <div class="dash-stat">
                  <span class="dash-stat-label">Worst Recovery</span>
                  <span class="dash-stat-value" style="color:#f59e0b">{{ worstBbEntry?.date ?? '—' }}</span>
                  <span class="dash-stat-sub" v-if="worstBbEntry">+{{ worstBbEntry.bodyBatteryChange }} body battery</span>
                </div>
                <div class="dash-stat">
                  <span class="dash-stat-label">Avg RHR</span>
                  <span class="dash-stat-value" style="color:#f87171">{{ dashAvgRhr !== null ? `${dashAvgRhr} bpm` : '—' }}</span>
                  <span class="dash-stat-sub">Athletic baseline</span>
                </div>
                <div class="dash-stat">
                  <span class="dash-stat-label">Avg Body Battery</span>
                  <span class="dash-stat-value" style="color:#34d399">{{ dashAvgBb !== null ? `+${dashAvgBb}` : '—' }}</span>
                </div>
              </div>
            </el-tab-pane>

            <!-- BEDTIME -->
            <el-tab-pane label="Bedtime" name="bedtime">
              <div class="dash-chart-card">
                <p class="dash-chart-label">BEDTIME TREND</p>
                <p class="dash-chart-hint">Minutes past midnight (negative = before midnight)</p>
                <div class="dash-chart-wrap">
                  <Line :data="bedtimeAreaChartData" :options="bedtimeAreaOpts" />
                </div>
              </div>

              <div class="dash-chart-card">
                <p class="dash-chart-label">NIGHT-BY-NIGHT BEDTIMES</p>
                <div class="bedtime-table">
                  <div v-for="log in dashLogs" :key="log.id" class="bedtime-row">
                    <span class="bedtime-date">{{ log.date.slice(5) }}</span>
                    <div class="bedtime-bar-bg">
                      <div class="bedtime-bar-fill" :style="{ width: bedtimeBarWidth(bedtimeToMin(log.bedtime)), background: bedtimeColor(bedtimeToMin(log.bedtime)) }" />
                    </div>
                    <span class="bedtime-label" :style="{ color: bedtimeColor(bedtimeToMin(log.bedtime)) }">{{ bedtimeLabel(bedtimeToMin(log.bedtime)) }}</span>
                  </div>
                </div>
                <div class="bedtime-legend">
                  <span v-for="([l, c]) in [['Before midnight','#34d399'],['Before 1 AM','#60a5fa'],['1–2:40 AM','#f59e0b'],['> 2:40 AM','#ef4444']]" :key="l" class="bedtime-legend-item">
                    <span class="bedtime-legend-dot" :style="{ background: c }" />{{ l }}
                  </span>
                </div>
              </div>

              <div class="dash-stat-grid">
                <div class="dash-stat">
                  <span class="dash-stat-label">Earliest Bedtime</span>
                  <span class="dash-stat-value" style="color:#34d399">{{ earliestBedtimeEntry ? bedtimeLabel(bedtimeToMin(earliestBedtimeEntry.bedtime)) : '—' }}</span>
                  <span class="dash-stat-sub" v-if="earliestBedtimeEntry">{{ earliestBedtimeEntry.date }}</span>
                </div>
                <div class="dash-stat">
                  <span class="dash-stat-label">Latest Bedtime</span>
                  <span class="dash-stat-value" style="color:#ef4444">{{ latestBedtimeEntry ? bedtimeLabel(bedtimeToMin(latestBedtimeEntry.bedtime)) : '—' }}</span>
                  <span class="dash-stat-sub" v-if="latestBedtimeEntry">{{ latestBedtimeEntry.date }}</span>
                </div>
                <div class="dash-stat">
                  <span class="dash-stat-label">Avg Bedtime</span>
                  <span class="dash-stat-value" style="color:#f59e0b">{{ bedtimeLabel(dashAvgBedtimeMin) }}</span>
                  <span class="dash-stat-sub">Goal: before midnight</span>
                </div>
                <div class="dash-stat">
                  <span class="dash-stat-label">Sub-1 AM Nights</span>
                  <span class="dash-stat-value" style="color:#60a5fa">{{ sub1amNights }}/{{ dashLogs.length }}</span>
                  <span class="dash-stat-sub">of total nights</span>
                </div>
              </div>
            </el-tab-pane>

          </el-tabs>
        </template>
      </el-tab-pane>

      <!-- ── LOGS TAB ───────────────────────────────────────────────── -->
      <el-tab-pane label="Logs" name="logs">

        <!-- Stats row -->
        <div v-if="logs.length" class="stats-row">
          <div class="stat-card">
            <span class="stat-label">Avg Sleep</span>
            <span class="stat-value">{{ avgSleepMin ? fmtDuration(avgSleepMin) : '—' }}</span>
          </div>
          <div class="stat-card" :class="{ 'stat-card--alert': spo2AlertCount > 0 }">
            <span class="stat-label">SpO₂ Alerts</span>
            <span class="stat-value">
              {{ spo2AlertCount }} nights &lt;90%
              <span v-if="worstSpo2 !== null" class="stat-worst">(worst: {{ worstSpo2 }}%)</span>
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Avg Body Battery</span>
            <span class="stat-value">{{ avgBattery !== null ? `+${avgBattery}` : '—' }}</span>
          </div>
        </div>

        <!-- SpO2 warning banner -->
        <div v-if="spo2AlertCount > 0" class="spo2-banner">
          ⚠️ <strong>{{ spo2AlertCount }} night{{ spo2AlertCount > 1 ? 's' : '' }}</strong> with lowest SpO₂ below 90%
          <span v-if="worstSpo2 !== null"> — worst recorded: <strong>{{ worstSpo2 }}%</strong></span>.
          Consider consulting a doctor about potential sleep apnea.
        </div>

        <!-- Empty state -->
        <div v-if="!loading && logs.length === 0" class="empty-state">
          No sleep logs yet. Add a night or import your dataset.
        </div>

        <!-- Log list -->
        <div class="log-list">
          <div v-for="log in logs" :key="log.id" class="log-card">

            <div class="log-top">
              <div class="log-top-left">
                <span class="log-date">{{ fmtDate(log.date) }}</span>
                <span class="source-badge" :class="`source-badge--${log.source}`">{{ log.source }}</span>
                <span v-if="log.lowestSpo2Pct !== null && log.lowestSpo2Pct < 90" class="spo2-alert-badge">
                  ⚠️ SpO₂ {{ log.lowestSpo2Pct }}%
                </span>
              </div>
              <div class="log-actions">
                <el-button text size="small" @click="openEdit(log)">✏️</el-button>
                <el-button text size="small" type="danger" @click="deleteLog(log.id)">🗑</el-button>
              </div>
            </div>

            <div class="log-time-row">
              <span v-if="log.bedtime && log.wakeTime" class="log-time">
                {{ log.bedtime }} → {{ log.wakeTime }}
              </span>
              <span
                v-if="log.totalSleepMin"
                class="log-duration"
                :class="sleepDurationClass(log.totalSleepMin)"
              >{{ fmtDuration(log.totalSleepMin) }}</span>
            </div>

            <div v-if="stageSegments(log).length" class="stage-bar-wrap">
              <div class="stage-bar">
                <div
                  v-for="seg in stageSegments(log)"
                  :key="seg.label"
                  class="stage-seg"
                  :style="{ width: seg.pct + '%', background: seg.color }"
                  :title="`${seg.label}: ${seg.pct}%`"
                />
              </div>
              <div class="stage-legend">
                <span v-for="seg in stageSegments(log)" :key="seg.label" class="legend-item">
                  <span class="legend-dot" :style="{ background: seg.color }" />
                  {{ seg.label }} {{ seg.pct }}%
                </span>
              </div>
            </div>

            <div class="metrics-row">
              <span v-if="log.restingHrBpm" class="metric">❤️ {{ log.restingHrBpm }} bpm</span>
              <span v-if="log.avgSpo2Pct || log.lowestSpo2Pct" class="metric" :class="spo2Class(log.lowestSpo2Pct)">
                🫁 SpO₂ {{ log.avgSpo2Pct }}% / {{ log.lowestSpo2Pct }}% low
              </span>
              <span v-if="log.avgRespirationBrpm" class="metric">🌬 {{ log.avgRespirationBrpm }} brpm</span>
              <span v-if="log.bodyBatteryChange !== null" class="metric">🔋 +{{ log.bodyBatteryChange }}</span>
            </div>

            <p v-if="log.notes" class="log-notes">{{ log.notes }}</p>
          </div>
        </div>

      </el-tab-pane>
    </el-tabs>

    <!-- ── Add / Edit Dialog ──────────────────────────────────────── -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingLog ? 'Edit Sleep Log' : 'Add Sleep Night'"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form label-position="top" @submit.prevent="saveLog" class="sleep-form">
        <div class="form-row">
          <el-form-item label="Date" style="flex: 1">
            <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" placeholder="Date" style="width: 100%" />
          </el-form-item>
          <el-form-item label="Source" style="flex: 1">
            <el-select v-model="form.source" style="width: 100%">
              <el-option label="Garmin" value="garmin" />
              <el-option label="Phone" value="phone" />
              <el-option label="Manual" value="manual" />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="Bedtime (HH:MM)" style="flex: 1">
            <el-input v-model="form.bedtime" placeholder="e.g. 01:34" maxlength="5" />
          </el-form-item>
          <el-form-item label="Wake Time (HH:MM)" style="flex: 1">
            <el-input v-model="form.wakeTime" placeholder="e.g. 09:42" maxlength="5" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="Total Sleep (min)" style="flex: 1">
            <el-input-number v-model="form.totalSleepMin" :min="0" :max="1440" style="width: 100%" />
          </el-form-item>
          <el-form-item label="Awake (min)" style="flex: 1">
            <el-input-number v-model="form.awakeMin" :min="0" style="width: 100%" />
          </el-form-item>
        </div>
        <div class="form-section-label">Sleep Stages</div>
        <div class="form-row">
          <el-form-item label="Deep (min)" style="flex: 1">
            <el-input-number v-model="form.deepMin" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="Light (min)" style="flex: 1">
            <el-input-number v-model="form.lightMin" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="REM (min)" style="flex: 1">
            <el-input-number v-model="form.remMin" :min="0" style="width: 100%" />
          </el-form-item>
        </div>
        <div class="form-section-label">Health Metrics</div>
        <div class="form-row">
          <el-form-item label="Resting HR (bpm)" style="flex: 1">
            <el-input-number v-model="form.restingHrBpm" :min="20" :max="200" style="width: 100%" />
          </el-form-item>
          <el-form-item label="Body Battery" style="flex: 1">
            <el-input-number v-model="form.bodyBatteryChange" :min="0" :max="100" style="width: 100%" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="Avg SpO₂ (%)" style="flex: 1">
            <el-input-number v-model="form.avgSpo2Pct" :min="50" :max="100" style="width: 100%" />
          </el-form-item>
          <el-form-item label="Lowest SpO₂ (%)" style="flex: 1">
            <el-input-number v-model="form.lowestSpo2Pct" :min="50" :max="100" style="width: 100%" />
          </el-form-item>
          <el-form-item label="Avg Resp (brpm)" style="flex: 1">
            <el-input-number v-model="form.avgRespirationBrpm" :min="1" :max="60" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="Notes">
          <el-input v-model="form.notes" type="textarea" :rows="2" maxlength="1000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">Cancel</el-button>
        <el-button type="primary" :disabled="!form.date || !form.source" @click="saveLog">
          {{ editingLog ? 'Save' : 'Add' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ── Import JSON Dialog ─────────────────────────────────────── -->
    <el-dialog v-model="showImportDialog" title="Import Sleep Data (JSON)" width="520px" :close-on-click-modal="false">
      <p class="import-hint">
        Paste your sleep dataset JSON. Accepts an array or an object with a
        <code>sleep_dataset</code> key. Duplicate dates are updated in place.
      </p>
      <el-input
        v-model="importJson"
        type="textarea"
        :rows="10"
        placeholder='[{"date":"2026-03-15","source":"garmin",...}]'
        @input="importParsed = null; importError = ''"
      />
      <div v-if="importError" class="import-error">{{ importError }}</div>
      <div v-if="importParsed" class="import-preview">
        ✓ {{ importParsed.length }} entries parsed — ready to import.
      </div>
      <template #footer>
        <el-button @click="showImportDialog = false">Cancel</el-button>
        <el-button @click="parseImportJson" :disabled="!importJson.trim()">Parse</el-button>
        <el-button type="primary" :disabled="!importParsed || importLoading" :loading="importLoading" @click="confirmImport">
          Import
        </el-button>
      </template>
    </el-dialog>

    <!-- ── Parsed Screenshot Dialog ───────────────────────────────── -->
    <el-dialog v-model="showParsedDialog" title="Confirm Parsed Sleep Data" width="540px" :close-on-click-modal="false">
      <p class="import-hint">Review the extracted data before importing. Remove any incorrect entries.</p>
      <div class="parsed-list">
        <div v-for="(entry, idx) in parsedEntries" :key="idx" class="parsed-card">
          <div class="parsed-card-header">
            <span class="parsed-date">{{ entry.date ?? 'Unknown date' }}</span>
            <el-button text size="small" type="danger" @click="removeParsedEntry(idx)">Remove</el-button>
          </div>
          <div class="parsed-grid">
            <span class="parsed-metric" v-if="entry.totalSleepMin">🛏 {{ fmtDuration(entry.totalSleepMin) }}</span>
            <span class="parsed-metric" v-if="entry.bedtime && entry.wakeTime">🕐 {{ entry.bedtime }} → {{ entry.wakeTime }}</span>
            <span class="parsed-metric" v-if="entry.deepMin">Deep {{ entry.deepMin }}m</span>
            <span class="parsed-metric" v-if="entry.remMin">REM {{ entry.remMin }}m</span>
            <span class="parsed-metric" v-if="entry.lightMin">Light {{ entry.lightMin }}m</span>
            <span class="parsed-metric" v-if="entry.restingHrBpm">❤️ {{ entry.restingHrBpm }} bpm</span>
            <span class="parsed-metric" v-if="entry.bodyBatteryChange">🔋 +{{ entry.bodyBatteryChange }}</span>
            <span class="parsed-metric" v-if="entry.avgSpo2Pct">🫁 {{ entry.avgSpo2Pct }}% avg / {{ entry.lowestSpo2Pct }}% low</span>
            <span class="parsed-metric" v-if="entry.avgRespirationBrpm">🌬 {{ entry.avgRespirationBrpm }} brpm</span>
          </div>
        </div>
        <div v-if="!parsedEntries.length" class="import-error">All entries removed.</div>
      </div>
      <template #footer>
        <el-button @click="showParsedDialog = false">Cancel</el-button>
        <el-button type="primary" :disabled="!parsedEntries.length || importLoading" :loading="importLoading" @click="confirmParsedImport">
          Import {{ parsedEntries.length }} {{ parsedEntries.length === 1 ? 'Entry' : 'Entries' }}
        </el-button>
      </template>
    </el-dialog>

  </div>
</template>

<style scoped>
.sleep-page {
  max-width: 760px;
}

.sleep-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 0 16px;
  gap: 12px;
}

.sleep-title {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--color-heading);
  margin: 0;
}

.sleep-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.55;
  margin: 4px 0 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

/* ── Dashboard ──────────────────────────────────────────────────────────────── */

.dash-alert-banner {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
  font-size: 1.1rem;
}

.dash-alert-title {
  margin: 0 0 4px;
  font-weight: 600;
  color: #ef4444;
  font-size: 0.88rem;
}

.dash-alert-body {
  margin: 0;
  font-size: 0.78rem;
  color: #9ca3af;
  line-height: 1.5;
}

.dash-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.dash-stat {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dash-stat--alert {
  background: rgba(239, 68, 68, 0.06);
  border-color: rgba(239, 68, 68, 0.25);
}

.dash-stat-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text);
  opacity: 0.5;
}

.dash-stat-value {
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--color-heading);
  font-family: monospace;
  line-height: 1.1;
  margin-top: 2px;
}

.dash-stat-sub {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.45;
  margin-top: 2px;
}

.dash-chart-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 14px;
}

.dash-chart-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.5;
  margin: 0 0 4px;
}

.dash-chart-hint {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.3;
  margin: 0 0 12px;
}

.dash-chart-wrap {
  height: 200px;
  position: relative;
}

/* Key findings */
.dash-finding {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.dash-finding-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 3px;
}

.dash-finding-dot--critical { background: #ef4444; }
.dash-finding-dot--warn     { background: #f59e0b; }
.dash-finding-dot--good     { background: #34d399; }

.dash-finding-text {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.8;
  line-height: 1.5;
}

.dash-finding-empty {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.35;
}

/* SpO₂ distribution */
.dist-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.dist-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dist-label {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.75;
  flex: 1;
}

.dist-count {
  font-size: 0.85rem;
  font-weight: 700;
  font-family: monospace;
  min-width: 60px;
  text-align: right;
}

.dist-bar-bg {
  width: 80px;
  height: 6px;
  background: var(--color-background-mute);
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}

.dist-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s;
}

/* Sleep stages legend */
.stages-legend {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  justify-content: center;
}

.stages-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.6;
}

.stages-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

/* Bedtime table */
.bedtime-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.bedtime-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bedtime-date {
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--color-text);
  opacity: 0.5;
  width: 42px;
  flex-shrink: 0;
}

.bedtime-bar-bg {
  flex: 1;
  height: 6px;
  background: var(--color-background-mute);
  border-radius: 3px;
  overflow: hidden;
}

.bedtime-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.bedtime-label {
  font-size: 0.75rem;
  font-weight: 700;
  font-family: monospace;
  width: 40px;
  text-align: right;
  flex-shrink: 0;
}

.bedtime-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.bedtime-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.55;
}

.bedtime-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

/* ── Logs tab ────────────────────────────────────────────────────────────────── */

.stats-row {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 140px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 10px 14px;
  background: var(--color-background-soft);
}

.stat-card--alert {
  border-color: #ef444455;
  background: #ef444408;
}

.stat-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.55;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
}

.stat-worst {
  font-size: 0.78rem;
  font-weight: 400;
  color: #ef4444;
}

.spo2-banner {
  border: 1px solid #ef444466;
  background: #ef444410;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.85rem;
  color: #ef4444;
  margin-bottom: 14px;
  line-height: 1.5;
}

.empty-state {
  text-align: center;
  padding: 48px 0;
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.45;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.log-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px 16px;
  background: var(--color-background-soft);
}

.log-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.log-top-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.log-date {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--color-heading);
}

.source-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 8px;
  border: 1px solid transparent;
  text-transform: capitalize;
}

.source-badge--garmin { background: #6366f120; color: #6366f1; border-color: #6366f140; }
.source-badge--phone  { background: #10b98120; color: #10b981; border-color: #10b98140; }
.source-badge--manual { background: #f59e0b20; color: #f59e0b; border-color: #f59e0b40; }

.spo2-alert-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 8px;
  background: #ef444418;
  color: #ef4444;
  border: 1px solid #ef444440;
}

.log-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.log-time-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.log-time {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
  font-family: monospace;
}

.log-duration {
  font-size: 0.85rem;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 8px;
  border: 1px solid;
}

.dur--good    { color: #10b981; border-color: #10b98155; background: #10b98112; }
.dur--ok      { color: #f59e0b; border-color: #f59e0b55; background: #f59e0b12; }
.dur--warn    { color: #f97316; border-color: #f9731655; background: #f9731612; }
.dur--critical { color: #ef4444; border-color: #ef444455; background: #ef444412; }

.stage-bar-wrap { margin-bottom: 8px; }

.stage-bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--color-background-mute);
  margin-bottom: 5px;
}

.stage-seg {
  height: 100%;
  transition: width 0.3s;
}

.stage-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.7;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.metrics-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}

.metric {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.75;
}

.spo2--warn     { color: #f97316 !important; opacity: 1 !important; font-weight: 700; }
.spo2--critical { color: #ef4444 !important; opacity: 1 !important; font-weight: 700; }
.spo2--ok       {}

.log-notes {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.55;
  font-style: italic;
  margin: 6px 0 0;
}

/* ── Form ──────────────────────────────────────────────────────────────────── */

.sleep-form .form-row {
  display: flex;
  gap: 12px;
}

.form-section-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text);
  opacity: 0.5;
  margin: 4px 0 2px;
}

/* ── Import / Parsed dialogs ───────────────────────────────────────────────── */

.import-hint {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.65;
  margin: 0 0 10px;
  line-height: 1.5;
}

.import-hint code {
  background: var(--color-background-mute);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.78rem;
}

.import-error {
  margin-top: 8px;
  font-size: 0.82rem;
  color: #ef4444;
}

.import-preview {
  margin-top: 8px;
  font-size: 0.82rem;
  color: #10b981;
  font-weight: 600;
}

.parsed-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
}

.parsed-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px 14px;
  background: var(--color-background-soft);
}

.parsed-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.parsed-date {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-heading);
  font-family: monospace;
}

.parsed-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.parsed-metric {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.75;
  background: var(--color-background-mute);
  padding: 2px 8px;
  border-radius: 6px;
}
</style>
