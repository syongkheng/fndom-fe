<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Line, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import PageBackButton from '@/components/common/PageBackButton.vue'
import { useAnalyticsStore } from '@/stores/analytics'
import { useThemeStore } from '@/stores/theme'
import type { AnalyticsBucket, AnalyticsSummary } from '@/interfaces/analytics.model'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip)

const route = useRoute()
const { t, locale } = useI18n()
const store = useAnalyticsStore()
const themeStore = useThemeStore()

const systemKey = computed(() => String(route.params.systemKey))
const hours = ref<24 | 168>(24)
const summary = ref<AnalyticsSummary | null>(null)
const loading = ref(true)
const error = ref<'noAccess' | 'loadFailed' | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    summary.value = await store.fetchSummary(systemKey.value, hours.value)
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    error.value = status === 403 ? 'noAccess' : 'loadFailed'
    summary.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch([systemKey, hours], load)

// ── Theme tokens ─────────────────────────────────────────────────────────────
// Series hue = brand primary, one step deeper in dark mode so it sits inside the
// dark-surface lightness band (validated: light #E8452C on #FFFFFF, dark #F25E3D on #231C18).
const palette = computed(() => {
  const dark = themeStore.isDark
  const css = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return {
    series: dark ? '#F25E3D' : '#E8452C',
    seriesFill: dark ? 'rgba(242, 94, 61, 0.14)' : 'rgba(232, 69, 44, 0.10)',
    grid: v('--color-border', dark ? '#3A2F29' : '#EADFD3'),
    tick: dark ? '#8F7A6A' : '#A28B7B',
    text: v('--color-text', dark ? '#FBEFE3' : '#2B1B14'),
    surface: dark ? '#231C18' : '#FFFFFF',
  }
})

const dateLocale = computed(() => (locale.value === 'zh' ? 'zh-CN' : 'en-GB'))

function hourLabel(ms: number): string {
  const d = new Date(ms)
  const time = d.toLocaleTimeString(dateLocale.value, { hour: '2-digit', minute: '2-digit', hour12: false })
  if (hours.value <= 24) return time
  return `${d.toLocaleDateString(dateLocale.value, { weekday: 'short', day: '2-digit' })} ${time}`
}

const nf = computed(() => new Intl.NumberFormat(dateLocale.value))
const fmt = (n: number) => nf.value.format(n)

const viewsPerSession = computed(() => {
  const s = summary.value
  if (!s || !s.views.uniqueSessions) return '–'
  return (s.views.total / s.views.uniqueSessions).toFixed(1)
})

// ── Line: page views per hour ────────────────────────────────────────────────
const lineData = computed<ChartData<'line'>>(() => ({
  labels: summary.value?.views.series.map((p) => hourLabel(p.t)) ?? [],
  datasets: [
    {
      label: t('analytics.totalViews'),
      data: summary.value?.views.series.map((p) => p.views) ?? [],
      borderColor: palette.value.series,
      backgroundColor: palette.value.seriesFill,
      fill: true,
      borderWidth: 2,
      tension: 0.25,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHitRadius: 12,
      pointHoverBackgroundColor: palette.value.series,
      pointHoverBorderColor: palette.value.surface,
      pointHoverBorderWidth: 2,
    },
  ],
}))

const tooltipBase = computed(() => ({
  backgroundColor: palette.value.surface,
  titleColor: palette.value.text,
  bodyColor: palette.value.text,
  borderColor: palette.value.grid,
  borderWidth: 1,
  padding: 10,
  displayColors: false,
}))

const lineOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...tooltipBase.value,
      callbacks: {
        label: (ctx) => {
          const p = summary.value?.views.series[ctx.dataIndex]
          if (!p) return ''
          return [`${t('analytics.totalViews')}: ${fmt(p.views)}`, `${t('analytics.uniqueSessions')}: ${fmt(p.sessions)}`]
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { color: palette.value.grid },
      ticks: { color: palette.value.tick, maxTicksLimit: hours.value <= 24 ? 8 : 7, maxRotation: 0, autoSkip: true },
    },
    y: {
      beginAtZero: true,
      grid: { color: palette.value.grid },
      border: { display: false },
      ticks: { color: palette.value.tick, precision: 0, maxTicksLimit: 5 },
    },
  },
}))

// ── Horizontal bars: sessions per breakpoint / size ──────────────────────────
function bucketLabel(b: AnalyticsBucket, kind: 'breakpoint' | 'size'): string {
  if (kind === 'size') return t(`analytics.sizes.${b.key in { small: 1, medium: 1, large: 1 } ? b.key : 'unknown'}`)
  return b.key === 'unknown' ? t('analytics.unknownBreakpoint') : b.label
}

function barData(buckets: AnalyticsBucket[], kind: 'breakpoint' | 'size'): ChartData<'bar'> {
  return {
    labels: buckets.map((b) => bucketLabel(b, kind)),
    datasets: [
      {
        label: t('analytics.colSessions'),
        data: buckets.map((b) => b.sessions),
        backgroundColor: palette.value.series,
        hoverBackgroundColor: palette.value.series,
        borderRadius: 4,
        borderSkipped: 'start',
        barPercentage: 0.7,
        categoryPercentage: 0.9,
        maxBarThickness: 22,
      },
    ],
  }
}

const breakpointBars = computed(() => barData(summary.value?.breakpoints ?? [], 'breakpoint'))
const sizeBars = computed(() => barData(summary.value?.sizes ?? [], 'size'))

const barOptions = computed<ChartOptions<'bar'>>(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      ...tooltipBase.value,
      callbacks: { label: (ctx) => `${t('analytics.colSessions')}: ${fmt(Number(ctx.raw))}` },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: palette.value.grid },
      border: { display: false },
      ticks: { color: palette.value.tick, precision: 0, maxTicksLimit: 5 },
    },
    y: {
      grid: { display: false },
      border: { color: palette.value.grid },
      ticks: { color: palette.value.text },
    },
  },
}))

const barHeight = (n: number) => `${Math.max(n, 2) * 34 + 40}px`
const hasData = computed(() => (summary.value?.views.total ?? 0) > 0)
</script>

<template>
  <div class="page-container an-dash">
    <div class="an-header">
      <PageBackButton to="/analytics" />
      <div class="an-header-text">
        <h1 class="an-title">{{ summary?.system.displayName ?? systemKey }}</h1>
        <p class="an-subtitle">{{ hours === 24 ? t('analytics.range24h') : t('analytics.range7d') }}</p>
      </div>
      <div class="an-controls">
        <el-radio-group v-model="hours" size="small">
          <el-radio-button :value="24">{{ t('analytics.range24h') }}</el-radio-button>
          <el-radio-button :value="168">{{ t('analytics.range7d') }}</el-radio-button>
        </el-radio-group>
        <el-button size="small" :loading="loading" @click="load">{{ t('analytics.refresh') }}</el-button>
      </div>
    </div>

    <p v-if="error" class="an-empty">{{ t(`analytics.${error}`) }}</p>

    <el-skeleton v-else-if="loading && !summary" :rows="10" animated />

    <template v-else-if="summary">
      <section class="an-kpis">
        <div class="an-kpi">
          <span class="an-kpi-label">{{ t('analytics.totalViews') }}</span>
          <span class="an-kpi-value">{{ fmt(summary.views.total) }}</span>
        </div>
        <div class="an-kpi">
          <span class="an-kpi-label">{{ t('analytics.uniqueSessions') }}</span>
          <span class="an-kpi-value">{{ fmt(summary.views.uniqueSessions) }}</span>
        </div>
        <div class="an-kpi">
          <span class="an-kpi-label">{{ t('analytics.viewsPerSession') }}</span>
          <span class="an-kpi-value">{{ viewsPerSession }}</span>
        </div>
      </section>

      <section class="an-panel">
        <header class="an-panel-head">
          <h2 class="an-panel-title">{{ t('analytics.viewsOverTime') }}</h2>
          <p class="an-panel-hint">{{ t('analytics.viewsOverTimeHint') }}</p>
        </header>
        <div class="an-line-wrap">
          <Line :data="lineData" :options="lineOptions" />
        </div>
      </section>

      <p v-if="!hasData" class="an-empty">{{ t('analytics.noData') }}</p>

      <div v-else class="an-grid">
        <section class="an-panel">
          <header class="an-panel-head">
            <h2 class="an-panel-title">{{ t('analytics.byBreakpoint') }}</h2>
            <p class="an-panel-hint">{{ t('analytics.byBreakpointHint') }}</p>
          </header>
          <div :style="{ height: barHeight(summary.breakpoints.length) }">
            <Bar :data="breakpointBars" :options="barOptions" />
          </div>
          <table class="an-table">
            <thead>
              <tr>
                <th>{{ t('analytics.colBucket') }}</th>
                <th class="num">{{ t('analytics.colSessions') }}</th>
                <th class="num">{{ t('analytics.colViews') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in summary.breakpoints" :key="b.key">
                <td>{{ bucketLabel(b, 'breakpoint') }}</td>
                <td class="num">{{ fmt(b.sessions) }}</td>
                <td class="num">{{ fmt(b.views) }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="an-panel">
          <header class="an-panel-head">
            <h2 class="an-panel-title">{{ t('analytics.bySize') }}</h2>
            <p class="an-panel-hint">{{ t('analytics.bySizeHint') }}</p>
          </header>
          <div :style="{ height: barHeight(summary.sizes.length) }">
            <Bar :data="sizeBars" :options="barOptions" />
          </div>
          <table class="an-table">
            <thead>
              <tr>
                <th>{{ t('analytics.colBucket') }}</th>
                <th class="num">{{ t('analytics.colSessions') }}</th>
                <th class="num">{{ t('analytics.colViews') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in summary.sizes" :key="b.key">
                <td>{{ bucketLabel(b, 'size') }}</td>
                <td class="num">{{ fmt(b.sessions) }}</td>
                <td class="num">{{ fmt(b.views) }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="an-panel an-panel-wide">
          <header class="an-panel-head">
            <h2 class="an-panel-title">{{ t('analytics.topPages') }}</h2>
          </header>
          <table class="an-table">
            <thead>
              <tr>
                <th>{{ t('analytics.colPage') }}</th>
                <th class="num">{{ t('analytics.colViews') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in summary.topPages" :key="p.page">
                <td class="an-page">{{ p.page }}</td>
                <td class="num">{{ fmt(p.views) }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.an-dash {
  max-width: 1040px;
  width: 100%;
  justify-self: center;
  padding-bottom: 48px;
}

.an-header {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  padding: 24px 0 20px;
}

.an-header-text {
  flex: 1;
  min-width: 0;
}

.an-title {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--color-heading);
  margin: 0 0 4px;
}

.an-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.55;
  margin: 0;
}

.an-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.an-empty {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.6;
  padding: 16px 0;
}

.an-kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.an-kpi {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-background-soft);
}

.an-kpi-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.55;
}

.an-kpi-value {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.an-panel {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-background-soft);
  margin-bottom: 12px;
  min-width: 0;
}

.an-panel-head {
  margin-bottom: 12px;
}

.an-panel-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
}

.an-panel-hint {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.55;
  margin: 2px 0 0;
  line-height: 1.4;
}

.an-line-wrap {
  height: 260px;
}

.an-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.an-grid .an-panel {
  margin-bottom: 0;
}

.an-panel-wide {
  grid-column: 1 / -1;
}

.an-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  margin-top: 12px;
}

.an-table th,
.an-table td {
  padding: 6px 4px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  color: var(--color-text);
}

.an-table th {
  font-weight: 600;
  opacity: 0.6;
}

.an-table tbody tr:last-child td {
  border-bottom: none;
}

.an-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.an-page {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.75rem;
  word-break: break-all;
}

@media (max-width: 800px) {
  .an-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .an-kpis {
    grid-template-columns: minmax(0, 1fr);
  }

  .an-kpi-value {
    font-size: 1.5rem;
  }
}
</style>
