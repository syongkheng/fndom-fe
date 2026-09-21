<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { useGarminHealthStore } from '@/stores/garminHealth'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend)

const store = useGarminHealthStore()
const { t } = useI18n()

const historyDays = ref<7 | 14 | 30>(7)

async function loadAll() {
  await Promise.allSettled([store.fetchToday(), store.fetchSummary(historyDays.value)])
}

async function changeHistoryDays(days: 7 | 14 | 30) {
  historyDays.value = days
  await store.fetchSummary(days)
}

onMounted(loadAll)

// ── Stat cards ──────────────────────────────────────────────
const dash = (v: number | null | undefined) => (v === null || v === undefined ? '—' : String(v))

// ── High-stress detection for today's chart ────────────────
function isHighStress(recordedDt: number): boolean {
  return (store.today?.highStressWindows ?? []).some((w) => recordedDt >= w.start && recordedDt <= w.end)
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatWindow(w: { start: number; end: number }): string {
  return `${formatTime(w.start)} – ${formatTime(w.end)}`
}

const hasHighStressToday = computed(() => (store.today?.highStressWindows.length ?? 0) > 0)

// ── Today's intraday chart — metric filter ──────────────────
type IntradayMetric = 'stress' | 'bodyBattery' | 'heartRate' | 'all'
const intradayMetric = ref<IntradayMetric>('stress')

const METRIC_STYLES: Record<Exclude<IntradayMetric, 'all'>, { border: string; bg: string; point: string; dim: string }> = {
  stress: { border: 'rgba(230, 90, 90, 0.9)', bg: 'rgba(230, 90, 90, 0.12)', point: '#e64545', dim: 'rgba(230,90,90,0.55)' },
  bodyBattery: { border: 'rgba(103, 194, 58, 0.9)', bg: 'rgba(103, 194, 58, 0.12)', point: '#67c23a', dim: 'rgba(103,194,58,0.55)' },
  heartRate: { border: 'rgba(64, 158, 255, 0.9)', bg: 'rgba(64, 158, 255, 0.12)', point: '#409eff', dim: 'rgba(64,158,255,0.55)' },
}

function buildDataset(
  points: NonNullable<typeof store.today>['intraday'],
  metric: Exclude<IntradayMetric, 'all'>,
  fill: boolean,
) {
  const style = METRIC_STYLES[metric]
  const field = metric === 'stress' ? 'stressScore' : metric === 'bodyBattery' ? 'bodyBattery' : 'heartRate'
  return {
    label: t(`health.chart.${metric}`),
    data: points.map((p) => p[field]),
    borderColor: style.border,
    backgroundColor: style.bg,
    pointRadius: points.map((p) => (metric === 'stress' && isHighStress(p.recordedDt) ? 4 : 2)),
    pointBackgroundColor: points.map((p) => (metric === 'stress' && isHighStress(p.recordedDt) ? style.point : style.dim)),
    spanGaps: true,
    tension: 0.3,
    fill,
    yAxisID: metric === 'heartRate' ? 'yHr' : 'y',
  }
}

const stressChartData = computed(() => {
  const points = store.today?.intraday ?? []
  const selected = intradayMetric.value
  const isAll = selected === 'all'
  const metrics: Exclude<IntradayMetric, 'all'>[] =
    selected === 'all' ? ['stress', 'bodyBattery', 'heartRate'] : [selected]
  return {
    labels: points.map((p) => formatTime(p.recordedDt)),
    datasets: metrics.map((m) => buildDataset(points, m, !isAll)),
  }
})

const stressChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: intradayMetric.value === 'all' } },
  scales: {
    y: {
      display: intradayMetric.value !== 'heartRate',
      min: 0,
      max: 100,
      ticks: { stepSize: 25 },
    },
    yHr: {
      display: intradayMetric.value === 'heartRate' || intradayMetric.value === 'all',
      position: 'right' as const,
      grid: { drawOnChartArea: false },
      min: 40,
      max: 200,
    },
  },
}))

const hasTodayData = computed(() => (store.today?.intraday.length ?? 0) > 0)

// ── Trend chart — sleep score & avg stress over the selected range ──
const trendChartData = computed(() => {
  const rows = store.summary
  return {
    labels: rows.map((r) => new Date(r.date).toLocaleDateString([], { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: t('health.chart.sleepScore'),
        data: rows.map((r) => r.sleepScore),
        borderColor: '#409eff',
        backgroundColor: 'rgba(64, 158, 255, 0.12)',
        spanGaps: true,
        tension: 0.3,
      },
      {
        label: t('health.chart.avgStress'),
        data: rows.map((r) => r.avgStress),
        borderColor: 'rgba(230, 90, 90, 0.8)',
        backgroundColor: 'rgba(230, 90, 90, 0.08)',
        spanGaps: true,
        tension: 0.3,
      },
    ],
  }
})

const trendChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const } },
  scales: { y: { min: 0, max: 100, ticks: { stepSize: 25 } } },
}

const hasTrendData = computed(() => store.summary.length > 0)
</script>

<template>
  <div class="health-root">

    <div class="health-heading">
      <h1 class="health-title">{{ t('health.title') }}</h1>
      <p class="health-subtitle">{{ t('health.subtitle') }}</p>
    </div>

    <el-alert
      v-if="store.error"
      type="error"
      show-icon
      :closable="false"
      class="stress-banner"
      :title="t('toast.healthLoadFailed')"
    />

    <el-alert
      v-if="hasHighStressToday"
      type="warning"
      show-icon
      :closable="false"
      class="stress-banner"
    >
      <template #title>
        {{ t('health.highStressBanner') }}
        <span class="stress-windows">
          <span v-for="(w, i) in store.today!.highStressWindows" :key="i" class="stress-window-tag">
            {{ formatWindow(w) }}
          </span>
        </span>
      </template>
    </el-alert>

    <!-- Stat cards -->
    <div class="stat-cards" v-loading="store.isLoadingToday">
      <div class="stat-card">
        <div class="stat-card-label">{{ t('health.stat.sleepScore') }}</div>
        <div class="stat-card-value">{{ dash(store.today?.sleep?.score) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">{{ t('health.stat.restingHr') }}</div>
        <div class="stat-card-value">{{ dash(store.today?.sleep?.restingHr) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">{{ t('health.stat.currentBodyBattery') }}</div>
        <div class="stat-card-value">{{ dash(store.today?.currentBodyBattery) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">{{ t('health.stat.currentStress') }}</div>
        <div class="stat-card-value">{{ dash(store.today?.currentStress) }}</div>
      </div>
    </div>

    <!-- Today's intraday chart -->
    <div class="chart-card">
      <div class="chart-title-row">
        <div class="chart-title">{{ t('health.chart.todayTitle') }}</div>
        <el-radio-group v-model="intradayMetric" size="small">
          <el-radio-button value="stress">{{ t('health.chart.stress') }}</el-radio-button>
          <el-radio-button value="bodyBattery">{{ t('health.chart.bodyBattery') }}</el-radio-button>
          <el-radio-button value="heartRate">{{ t('health.chart.heartRate') }}</el-radio-button>
          <el-radio-button value="all">{{ t('health.chart.all') }}</el-radio-button>
        </el-radio-group>
      </div>
      <div class="chart-wrap" v-loading="store.isLoadingToday">
        <div v-if="!hasTodayData && !store.isLoadingToday" class="chart-empty">{{ t('health.chart.noDataToday') }}</div>
        <Line v-else :data="stressChartData" :options="stressChartOptions" />
      </div>
    </div>

    <!-- Trend chart -->
    <div class="chart-card">
      <div class="chart-title-row">
        <div class="chart-title">{{ t('health.chart.trendTitle') }}</div>
        <el-radio-group :model-value="historyDays" size="small" @update:model-value="changeHistoryDays">
          <el-radio-button :value="7">7d</el-radio-button>
          <el-radio-button :value="14">14d</el-radio-button>
          <el-radio-button :value="30">30d</el-radio-button>
        </el-radio-group>
      </div>
      <div class="chart-wrap" v-loading="store.isLoadingSummary">
        <div v-if="!hasTrendData && !store.isLoadingSummary" class="chart-empty">{{ t('health.chart.noDataTrend') }}</div>
        <Line v-else :data="trendChartData" :options="trendChartOptions" />
      </div>
    </div>

  </div>
</template>

<style scoped>
.health-root {
  max-width: 960px;
  width: 100%;
  justify-self: center;
  padding-bottom: 48px;
}

.health-heading {
  padding: 24px 0 20px;
}

.health-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 4px;
}

.health-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
  margin: 0;
}

.stress-banner {
  margin-bottom: 16px;
}

.stress-windows {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.stress-window-tag {
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--el-color-warning-light-8);
  border-radius: 4px;
  padding: 2px 6px;
}

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

.chart-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 16px 16px 12px;
  margin-bottom: 16px;
}

.chart-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
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
  height: 260px;
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

@media (max-width: 720px) {
  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
