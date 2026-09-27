<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { useNav } from '@/hooks/useNav'
import { useApplePayStore } from '@/stores/applepay'
import { useThemeStore } from '@/stores/theme'
import { useToast } from '@/composables/useToast'
import { storeToRefs } from 'pinia'
import { DEFAULT_APPLEPAY_CATEGORIES } from '@/constants/ApplePayCategories'
import type { ApplePayTransaction } from '@/interfaces/ApplePayTransaction.model'

ChartJS.register(ArcElement, Tooltip, Legend)

const { t } = useI18n()
const nav = useNav()
const store = useApplePayStore()
const themeStore = useThemeStore()
const toast = useToast()
const { transactions, isLoading } = storeToRefs(store)
const { isDark } = storeToRefs(themeStore)

onMounted(() => {
  store.fetchTransactions()
})

const activeTab = ref<'transactions' | 'statistics'>('transactions')

const categoryFilter = ref<string>('')

const categoryOptions = computed(() => {
  const used = transactions.value.map((tx) => tx.category?.trim()).filter((c): c is string => !!c)
  return Array.from(new Set([...DEFAULT_APPLEPAY_CATEGORIES, ...used]))
})

const filteredTransactions = computed(() => {
  if (!categoryFilter.value) return transactions.value
  return transactions.value.filter((tx) => (tx.category ?? '') === categoryFilter.value)
})

const totalAmount = computed(() => filteredTransactions.value.reduce((acc, tx) => acc + tx.amount, 0))

const CURRENCY = 'SGD'

const formatAmount = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: CURRENCY })

// Calendar cells and the day-detail list sit under one "Amounts in SGD"
// note (see .calendar-card-header), so they only need the number — repeating
// the currency code on every cell is what forced the ellipsis truncation.
const formatNumber = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (ts: number) =>
  new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// V1 rows (NFC taps) carry an Apple Pay device name; V2 rows (bank SMS
// forwarding) carry a card number instead — surface whichever the row has.
// V2 rows are also user-labelable (see isCardRow), so their fallback here
// is only ever shown before a label has been set.
const formatDetail = (tx: ApplePayTransaction) => tx.name ?? (tx.cardLast4 ? `•• ${tx.cardLast4}` : '—')
const isCardRow = (tx: ApplePayTransaction) => !tx.name && !!tx.cardLast4
const sourceLabel = (source: string) => (source === 'v2' ? t('applepay.sourceSms') : t('applepay.sourceNfc'))

const savingId = ref<string | null>(null)

const onCategoryChange = async (tx: ApplePayTransaction) => {
  savingId.value = tx.id
  const ok = await store.updateCategory(tx.id, tx.category?.trim() || null)
  savingId.value = null
  if (!ok) toast.error(t('applepay.saveFailed'))
}

const onCardLabelChange = async (tx: ApplePayTransaction) => {
  if (!tx.cardLast4) return
  const ok = await store.setCardLabel(tx.cardLast4, tx.cardLabel?.trim() || null)
  if (!ok) toast.error(t('applepay.cardLabelSaveFailed'))
}

// ── Statistics tab: month-scoped pie breakdowns + a calendar of daily spend ──

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

const calendarMonth = ref(startOfMonth(new Date()))
const selectedDayKey = ref<string | null>(null)

const shiftMonth = (delta: number) => {
  const d = calendarMonth.value
  calendarMonth.value = new Date(d.getFullYear(), d.getMonth() + delta, 1)
  selectedDayKey.value = null
}

const monthLabel = computed(() => calendarMonth.value.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))

const pad2 = (n: number) => String(n).padStart(2, '0')
const dayKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

// All transactions falling in the currently-viewed calendar month — the
// pie breakdowns and the calendar both read from this, independent of the
// Transactions tab's own category filter.
const monthTransactions = computed(() => {
  const y = calendarMonth.value.getFullYear()
  const m = calendarMonth.value.getMonth()
  return transactions.value.filter((tx) => {
    const d = new Date(tx.occurredDt)
    return d.getFullYear() === y && d.getMonth() === m
  })
})

const spendByDay = computed(() => {
  const map = new Map<string, ApplePayTransaction[]>()
  for (const tx of monthTransactions.value) {
    const key = dayKey(new Date(tx.occurredDt))
    const bucket = map.get(key)
    if (bucket) bucket.push(tx)
    else map.set(key, [tx])
  }
  return map
})

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// A 6x7 grid — leading/trailing days from adjacent months fill out the
// first/last week so the grid always aligns Sunday-first.
const calendarCells = computed(() => {
  const y = calendarMonth.value.getFullYear()
  const m = calendarMonth.value.getMonth()
  const startOffset = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7

  return Array.from({ length: totalCells }, (_, i) => {
    const date = new Date(y, m, i - startOffset + 1)
    const key = dayKey(date)
    const items = spendByDay.value.get(key) ?? []
    return {
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === m,
      total: items.reduce((sum, tx) => sum + tx.amount, 0),
      items,
    }
  })
})

const monthTotal = computed(() => monthTransactions.value.reduce((sum, tx) => sum + tx.amount, 0))
const daysInCalendarMonth = computed(
  () => new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() + 1, 0).getDate(),
)
const dailyAverage = computed(() => monthTotal.value / daysInCalendarMonth.value)

const selectDay = (cell: { key: string; total: number }) => {
  if (cell.total <= 0) return
  selectedDayKey.value = selectedDayKey.value === cell.key ? null : cell.key
}

const selectedDayTransactions = computed(() => {
  if (!selectedDayKey.value) return []
  return (spendByDay.value.get(selectedDayKey.value) ?? []).slice().sort((a, b) => b.occurredDt - a.occurredDt)
})

const selectedDayLabel = computed(() => {
  if (!selectedDayKey.value) return ''
  const [y, m, d] = selectedDayKey.value.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
})

// Categorical palette: fixed hue order, validated for CVD-safe adjacency
// (see the dataviz skill's color-formula.md). Capped at 8 named slices;
// anything past that folds into a muted "Other" bucket rather than
// generating a 9th hue.
const CATEGORY_HUES: Array<{ light: string; dark: string }> = [
  { light: '#2a78d6', dark: '#3987e5' },
  { light: '#eb6834', dark: '#d95926' },
  { light: '#1baf7a', dark: '#199e70' },
  { light: '#eda100', dark: '#c98500' },
  { light: '#e87ba4', dark: '#d55181' },
  { light: '#008300', dark: '#008300' },
  { light: '#4a3aa7', dark: '#9085e9' },
  { light: '#e34948', dark: '#e66767' },
]
const OTHER_HUE = { light: '#898781', dark: '#898781' }

interface BreakdownEntry {
  label: string
  amount: number
  color: string
}

function buildBreakdown(items: ApplePayTransaction[], labelFor: (tx: ApplePayTransaction) => string): BreakdownEntry[] {
  const totals = new Map<string, number>()
  for (const tx of items) {
    const label = labelFor(tx)
    totals.set(label, (totals.get(label) ?? 0) + tx.amount)
  }
  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
  const head = sorted.slice(0, CATEGORY_HUES.length)
  const tail = sorted.slice(CATEGORY_HUES.length)

  const entries: BreakdownEntry[] = head.map(([label, amount], i) => ({
    label,
    amount,
    color: isDark.value ? CATEGORY_HUES[i].dark : CATEGORY_HUES[i].light,
  }))
  if (tail.length) {
    entries.push({
      label: t('applepay.stats.other'),
      amount: tail.reduce((sum, [, amount]) => sum + amount, 0),
      color: isDark.value ? OTHER_HUE.dark : OTHER_HUE.light,
    })
  }
  return entries
}

const categoryLabelFor = (tx: ApplePayTransaction) => tx.category?.trim() || t('applepay.stats.uncategorized')
const cardLabelFor = (tx: ApplePayTransaction) =>
  tx.name ?? tx.cardLabel ?? (tx.cardLast4 ? `•• ${tx.cardLast4}` : t('applepay.stats.uncategorized'))

const categoryBreakdown = computed(() => buildBreakdown(monthTransactions.value, categoryLabelFor))
const cardBreakdown = computed(() => buildBreakdown(monthTransactions.value, cardLabelFor))

function toChartData(entries: BreakdownEntry[]) {
  return {
    labels: entries.map((e) => e.label),
    datasets: [
      {
        data: entries.map((e) => e.amount),
        backgroundColor: entries.map((e) => e.color),
        borderColor: isDark.value ? '#1a1a19' : '#fcfcfb',
        borderWidth: 2,
      },
    ],
  }
}

const categoryChartData = computed(() => toChartData(categoryBreakdown.value))
const cardChartData = computed(() => toChartData(cardBreakdown.value))

// Legend is disabled here — each pie has its own breakdown list (with
// swatch + label + amount) right below it, which does the same job with
// exact figures and works on touch, so a Chart.js legend would be redundant.
const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${ctx.label}: ${formatAmount(ctx.parsed)}`,
      },
    },
  },
}
</script>

<template>
  <div class="page-container">
    <div class="page-nav">
      <el-button circle size="small" @click="nav.redirectToDashboard()">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
    </div>

    <header class="list-header">
      <div>
        <p class="list-eyebrow">{{ t('applepay.eyebrow') }}</p>
        <h1 class="list-title">{{ t('applepay.title') }}</h1>
        <p class="list-subtitle">{{ t('applepay.subtitle') }}</p>
      </div>
    </header>

    <el-tabs v-model="activeTab">
      <el-tab-pane :label="t('applepay.tabs.transactions')" name="transactions">
        <div class="total-banner">
          <div class="total-banner-text">
            <span class="total-banner-label">{{ categoryFilter ? t('applepay.filteredTotal') : t('applepay.total') }}</span>
            <span class="total-banner-value">{{ formatAmount(totalAmount) }}</span>
          </div>
          <span class="total-banner-count">{{ t('applepay.transactionCount', { n: filteredTransactions.length }) }}</span>
        </div>

        <div class="filter-row">
          <el-select v-model="categoryFilter" clearable :placeholder="t('applepay.allCategories')" class="category-filter">
            <el-option v-for="opt in categoryOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </div>

        <div v-if="isLoading" class="loading-state">
          <el-skeleton :rows="6" animated />
        </div>

        <div v-else-if="filteredTransactions.length === 0" class="empty-text">
          {{ t('applepay.noTransactions') }}
        </div>

        <template v-else>
          <!-- Desktop / tablet: table -->
          <el-table :data="filteredTransactions" size="small" class="transactions-table table-view">
            <el-table-column :label="t('applepay.col.date')" min-width="150">
              <template #default="{ row }">{{ formatDate(row.occurredDt) }}</template>
            </el-table-column>
            <el-table-column :label="t('applepay.col.merchant')" min-width="160" prop="merchant" />
            <el-table-column :label="t('applepay.col.name')" min-width="160">
              <template #default="{ row }">
                <el-input
                  v-if="isCardRow(row)"
                  v-model="row.cardLabel"
                  size="small"
                  class="card-label-input"
                  :placeholder="t('applepay.addLabel')"
                  @blur="onCardLabelChange(row)"
                  @keyup.enter="onCardLabelChange(row)"
                >
                  <template #suffix>
                    <span class="card-last4-suffix">•• {{ row.cardLast4 }}</span>
                  </template>
                </el-input>
                <span v-else>{{ formatDetail(row) }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="t('applepay.col.source')" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.source === 'v2' ? 'success' : 'info'">{{ sourceLabel(row.source) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('applepay.col.amount')" width="120" align="right">
              <template #default="{ row }">{{ formatAmount(row.amount) }}</template>
            </el-table-column>
            <el-table-column :label="t('applepay.col.category')" min-width="180">
              <template #default="{ row }">
                <el-select
                  v-model="row.category"
                  class="category-select"
                  filterable
                  allow-create
                  default-first-option
                  clearable
                  :loading="savingId === row.id"
                  :placeholder="t('applepay.setCategory')"
                  @change="onCategoryChange(row)"
                >
                  <el-option v-for="opt in categoryOptions" :key="opt" :label="opt" :value="opt" />
                </el-select>
              </template>
            </el-table-column>
          </el-table>

          <!-- Mobile: cards -->
          <ul class="transactions-cards card-view">
            <li v-for="row in filteredTransactions" :key="row.id" class="tx-card">
              <div class="tx-card-top">
                <div class="tx-card-main">
                  <span class="tx-card-merchant">{{ row.merchant }}</span>
                  <el-input
                    v-if="isCardRow(row)"
                    v-model="row.cardLabel"
                    size="small"
                    class="card-label-input tx-card-name-input"
                    :placeholder="t('applepay.addLabel')"
                    @blur="onCardLabelChange(row)"
                    @keyup.enter="onCardLabelChange(row)"
                  >
                    <template #suffix>
                      <span class="card-last4-suffix">•• {{ row.cardLast4 }}</span>
                    </template>
                  </el-input>
                  <span v-else class="tx-card-name">{{ formatDetail(row) }}</span>
                </div>
                <span class="tx-card-amount">{{ formatAmount(row.amount) }}</span>
              </div>
              <div class="tx-card-date">
                {{ formatDate(row.occurredDt) }}
                <el-tag size="small" :type="row.source === 'v2' ? 'success' : 'info'" class="tx-card-source">{{ sourceLabel(row.source) }}</el-tag>
              </div>
              <el-select
                v-model="row.category"
                class="category-select"
                filterable
                allow-create
                default-first-option
                clearable
                :loading="savingId === row.id"
                :placeholder="t('applepay.setCategory')"
                @change="onCategoryChange(row)"
              >
                <el-option v-for="opt in categoryOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </li>
          </ul>
        </template>
      </el-tab-pane>

      <el-tab-pane :label="t('applepay.tabs.statistics')" name="statistics">
        <div class="stats-panel">
          <div class="stats-month-nav">
            <el-button circle size="small" @click="shiftMonth(-1)">
              <el-icon><ArrowLeft /></el-icon>
            </el-button>
            <span class="stats-month-label">{{ monthLabel }}</span>
            <el-button circle size="small" @click="shiftMonth(1)">
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>

          <div class="stats-summary-row">
            <div class="stat-tile">
              <span class="stat-tile-label">{{ t('applepay.stats.total') }}</span>
              <span class="stat-tile-value">{{ formatAmount(monthTotal) }}</span>
            </div>
            <div class="stat-tile">
              <span class="stat-tile-label">{{ t('applepay.stats.transactions') }}</span>
              <span class="stat-tile-value">{{ monthTransactions.length }}</span>
            </div>
            <div class="stat-tile">
              <span class="stat-tile-label">{{ t('applepay.stats.dailyAverage') }}</span>
              <span class="stat-tile-value">{{ formatAmount(dailyAverage) }}</span>
            </div>
          </div>

          <div class="stats-charts-row">
            <div class="chart-card">
              <div class="chart-title">{{ t('applepay.stats.byCategory') }}</div>
              <div class="pie-wrap">
                <Pie v-if="categoryBreakdown.length" :data="categoryChartData" :options="pieOptions" />
                <div v-else class="chart-empty">{{ t('applepay.stats.noData') }}</div>
              </div>
              <ul v-if="categoryBreakdown.length" class="pie-breakdown">
                <li v-for="entry in categoryBreakdown" :key="entry.label" class="pie-breakdown-item">
                  <span class="pie-breakdown-swatch" :style="{ background: entry.color }" />
                  <span class="pie-breakdown-label">{{ entry.label }}</span>
                  <span class="pie-breakdown-amount">{{ formatAmount(entry.amount) }}</span>
                </li>
              </ul>
            </div>

            <div class="chart-card">
              <div class="chart-title">{{ t('applepay.stats.byCard') }}</div>
              <div class="pie-wrap">
                <Pie v-if="cardBreakdown.length" :data="cardChartData" :options="pieOptions" />
                <div v-else class="chart-empty">{{ t('applepay.stats.noData') }}</div>
              </div>
              <ul v-if="cardBreakdown.length" class="pie-breakdown">
                <li v-for="entry in cardBreakdown" :key="entry.label" class="pie-breakdown-item">
                  <span class="pie-breakdown-swatch" :style="{ background: entry.color }" />
                  <span class="pie-breakdown-label">{{ entry.label }}</span>
                  <span class="pie-breakdown-amount">{{ formatAmount(entry.amount) }}</span>
                </li>
              </ul>
            </div>
          </div>

          <div class="calendar-card">
            <div class="calendar-card-header">
              <span class="calendar-currency-note">{{ t('applepay.stats.amountsIn', { currency: CURRENCY }) }}</span>
            </div>
            <div class="calendar-grid">
              <div v-for="wd in WEEKDAY_LABELS" :key="wd" class="calendar-weekday">{{ wd }}</div>
              <div
                v-for="cell in calendarCells"
                :key="cell.key"
                class="calendar-cell"
                :class="{
                  'calendar-cell--out': !cell.inMonth,
                  'calendar-cell--has-spend': cell.total > 0,
                  'calendar-cell--selected': selectedDayKey === cell.key,
                }"
                @click="selectDay(cell)"
              >
                <span class="calendar-cell-date">{{ cell.day }}</span>
                <span v-if="cell.total > 0" class="calendar-cell-amount">-{{ formatNumber(cell.total) }}</span>
              </div>
            </div>
          </div>

          <div v-if="selectedDayKey" class="day-detail-card">
            <div class="day-detail-header">
              <span class="day-detail-title">{{ selectedDayLabel }}</span>
              <el-button size="small" text @click="selectedDayKey = null">{{ t('applepay.stats.close') }}</el-button>
            </div>
            <ul class="day-detail-list">
              <li v-for="tx in selectedDayTransactions" :key="tx.id" class="day-detail-item">
                <span class="day-detail-merchant">{{ tx.merchant }}</span>
                <span class="day-detail-amount">-{{ formatNumber(tx.amount) }}</span>
              </li>
            </ul>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.page-nav {
  margin-bottom: 12px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 8px;
}

.list-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--el-color-primary);
  margin-bottom: 6px;
}

.list-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-heading);
}

.list-subtitle {
  font-size: 0.83rem;
  color: var(--color-text);
  opacity: 0.6;
  margin-top: 4px;
}

/* Headline stat for the tab — full-width and left-aligned instead of a
   small card stranded on its own row at the right, so it reads as "here's
   your total" rather than an odd floating box, and can't run into the
   mobile overflow issues a right-aligned fixed-width card is prone to. */
.total-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 16px 20px;
  border-radius: 14px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, var(--el-color-primary-light-9), var(--color-background-soft));
  border: 1px solid var(--el-color-primary-light-7);
}

.total-banner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.total-banner-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
}

.total-banner-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.total-banner-count {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.65;
  white-space: nowrap;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.category-filter {
  width: 220px;
}

.category-select {
  width: 100%;
}

.card-label-input {
  width: 100%;
  max-width: 200px;
}

.tx-card-name-input {
  max-width: 170px;
}

.card-last4-suffix {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.5;
  white-space: nowrap;
}

.empty-text {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.5;
  padding: 24px 4px;
}

.loading-state {
  padding: 20px 0;
}

/* Table/card swap — el-table's horizontal scroll is unusable on touch at
   narrow widths (columns get squeezed instead of scrolling cleanly), so
   below the app's usual 768px "medium" breakpoint we render cards instead. */
.card-view {
  display: none;
}

@media (max-width: 768px) {
  .table-view {
    display: none;
  }

  .card-view {
    display: flex;
  }
}

.transactions-cards {
  flex-direction: column;
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.tx-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.tx-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.tx-card-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tx-card-merchant {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tx-card-name {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tx-card-amount {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--color-heading);
  flex-shrink: 0;
}

.tx-card-date {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.5;
}

.tx-card-source {
  opacity: 1;
}

/* ── Statistics tab ─────────────────────────────────────────────────── */

.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.stats-month-label {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  min-width: 160px;
  text-align: center;
}

/* Grid, not flex-wrap — 3 equal columns at any width means the tiles
   never wrap unevenly (e.g. 2 + 1) on narrow phones; they just shrink. */
.stats-summary-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stat-tile {
  min-width: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-tile-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.55;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-tile-value {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Mobile-first: stacked by default, side-by-side only once there's
   comfortably enough width for both — flex-wrap alone wasn't reliably
   wrapping these before the content (long labels, unshrinkable amounts)
   forced a wider hypothetical size than the viewport, causing the second
   card to run off-screen instead of dropping to its own row. */
.stats-charts-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-card {
  min-width: 0;
  padding: 16px;
  border-radius: 12px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

@media (min-width: 640px) {
  .stats-charts-row {
    flex-direction: row;
  }

  .chart-card {
    flex: 1;
    min-width: 0;
  }
}

.chart-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 10px;
}

.pie-wrap {
  position: relative;
  height: 200px;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.5;
}

.pie-breakdown {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pie-breakdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: var(--color-text);
}

.pie-breakdown-swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pie-breakdown-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pie-breakdown-amount {
  font-weight: 700;
  color: var(--color-heading);
  flex-shrink: 0;
}

.calendar-card {
  padding: 16px;
  border-radius: 12px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.calendar-card-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.calendar-currency-note {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-weekday {
  min-width: 0;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.5;
  padding-bottom: 6px;
}

.calendar-cell {
  /* Grid items get an automatic min-width from their content's min-content
     size by default. The amount span below is `white-space: nowrap`, so
     without this override its full unwrapped width (e.g. "-SGD 195.17")
     became each cell's floor, forcing the whole 7-column grid wider than
     its container instead of letting the nowrap text truncate inside it. */
  min-width: 0;
  min-height: 64px;
  border-radius: 8px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid transparent;
}

.calendar-cell--out {
  opacity: 0.35;
}

.calendar-cell--has-spend {
  cursor: pointer;
  background: var(--color-background-mute);
}

.calendar-cell--has-spend:hover {
  border-color: var(--color-border-hover);
}

.calendar-cell--selected {
  border-color: var(--el-color-primary);
}

.calendar-cell-date {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.7;
}

.calendar-cell-amount {
  font-size: 0.75rem;
  font-weight: 700;
  color: #e64545;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.day-detail-card {
  padding: 16px;
  border-radius: 12px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.day-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.day-detail-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-heading);
}

.day-detail-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.day-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 0.82rem;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--color-background-mute);
}

.day-detail-merchant {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-detail-amount {
  color: #e64545;
  font-weight: 700;
  flex-shrink: 0;
}

@media (max-width: 540px) {
  .list-header {
    flex-direction: column;
    align-items: stretch;
  }

  .total-banner {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .stats-panel {
    gap: 16px;
  }

  .stats-month-label {
    min-width: 130px;
    font-size: 0.9rem;
  }

  .stat-tile {
    padding: 10px 10px;
  }

  .stat-tile-value {
    font-size: 1rem;
  }

  .chart-card {
    min-width: 0;
    padding: 12px;
  }

  .pie-wrap {
    height: 180px;
  }

  .calendar-card {
    padding: 10px;
  }

  .calendar-grid {
    gap: 2px;
  }

  .calendar-cell {
    min-height: 46px;
    padding: 4px 2px;
  }

  .calendar-cell-date {
    font-size: 0.68rem;
  }

  .calendar-cell-amount {
    font-size: 0.6rem;
  }

  .day-detail-item {
    padding: 8px;
  }
}
</style>
