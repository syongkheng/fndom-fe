<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, CopyDocument, Delete, Download, Plus } from '@element-plus/icons-vue'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { useNav } from '@/hooks/useNav'
import { useApplePayStore } from '@/stores/applepay'
import { useThemeStore } from '@/stores/theme'
import { useSsApiKeyStore, type SsApiKeyStatus } from '@/stores/ssApiKey'
import { useToast } from '@/composables/useToast'
import { storeToRefs } from 'pinia'
import { DEFAULT_APPLEPAY_CATEGORIES } from '@/constants/ApplePayCategories'
import type { ApplePayTransaction } from '@/interfaces/ApplePayTransaction.model'
import apiKeyHeaderImage from '@/assets/applepay-setup/shortcut-api-key-header.jpg'
import dbsManageNotificationsImage from '@/assets/applepay-setup/dbs-1-manage-notifications.jpg'
import dbsLocalTransactionsImage from '@/assets/applepay-setup/dbs-2-local-transactions.jpg'
import dbsOnlineTransactionsImage from '@/assets/applepay-setup/dbs-3-online-transactions.jpg'
import uobNotificationSettingsImage from '@/assets/applepay-setup/uob-1-notification-settings.jpg'
import uobCardActivityImage from '@/assets/applepay-setup/uob-2-card-activity.jpg'
import uobCardChargesImage from '@/assets/applepay-setup/uob-3-card-charges.jpg'

ChartJS.register(ArcElement, Tooltip, Legend)

const { t, locale } = useI18n()
const nav = useNav()
const store = useApplePayStore()
const themeStore = useThemeStore()
const ssKeyStore = useSsApiKeyStore()
const toast = useToast()
const { transactions, isLoading } = storeToRefs(store)
const { isDark } = storeToRefs(themeStore)

const serverBaseUrl = import.meta.env.VITE_SERVER_BASE_URL as string

onMounted(() => {
  store.fetchTransactions()
  refreshKeyStatus()
})

// ── Onboarding: SS API key + the "how to set this up" guide ────────────────

const setupGuideOpen = ref<string[]>([])
const keyStatusLoading = ref(false)
const ssKeyStatus = ref<SsApiKeyStatus>({ hasKey: false, name: null, createdDt: null, keyHint: null })
const keyGenerating = ref(false)
const freshlyGeneratedKey = ref('')

async function refreshKeyStatus() {
  keyStatusLoading.value = true
  try {
    ssKeyStatus.value = await ssKeyStore.fetchApiKeyStatus()
    // Open the guide by default only until the user has a key — once set
    // up, it stays collapsed (but is still there for reference/a 2nd device).
    if (!ssKeyStatus.value.hasKey) setupGuideOpen.value = ['guide']
  } catch {
    ssKeyStatus.value = { hasKey: false, name: null, createdDt: null, keyHint: null }
  } finally {
    keyStatusLoading.value = false
  }
}

async function handleGenerateKey() {
  keyGenerating.value = true
  try {
    const key = await ssKeyStore.generateApiKey()
    freshlyGeneratedKey.value = key
    await refreshKeyStatus()
    ElMessage({ type: 'warning', message: t('toast.ssKeyWarning'), duration: 6000 })
  } catch {
    toast.error(t('toast.ssKeyFailed'))
  } finally {
    keyGenerating.value = false
  }
}

async function copyGeneratedKey() {
  await navigator.clipboard.writeText(freshlyGeneratedKey.value)
  toast.success(t('toast.ssKeyCopied'))
  freshlyGeneratedKey.value = ''
}

interface BankGuideImage {
  src: string
  captionKey: string
}

interface BankGuide {
  key: string
  name: string
  shortcutUrl: string
  images: BankGuideImage[]
}

const bankGuides: BankGuide[] = [
  {
    key: 'dbs',
    name: 'DBS/POSB',
    shortcutUrl: 'https://www.icloud.com/shortcuts/817102d6ed7e49c1bfafe778618578b4',
    images: [
      { src: dbsManageNotificationsImage, captionKey: 'applepay.setup.bankImages.dbs1' },
      { src: dbsLocalTransactionsImage, captionKey: 'applepay.setup.bankImages.dbs2' },
      { src: dbsOnlineTransactionsImage, captionKey: 'applepay.setup.bankImages.dbs3' },
    ],
  },
  {
    key: 'uob',
    name: 'UOB',
    shortcutUrl: 'https://www.icloud.com/shortcuts/3c74ab6d2cd14966ad6eaf6893afebfe',
    images: [
      { src: uobNotificationSettingsImage, captionKey: 'applepay.setup.bankImages.uob1' },
      { src: uobCardActivityImage, captionKey: 'applepay.setup.bankImages.uob2' },
      { src: uobCardChargesImage, captionKey: 'applepay.setup.bankImages.uob3' },
    ],
  },
]

// ── Connection status: how long since the Shortcut last delivered a payment ──

const STALE_AFTER_DAYS = 3
const STALE_AFTER_MS = STALE_AFTER_DAYS * 24 * 60 * 60 * 1000

const now = ref(Date.now())
let nowTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => { nowTimer = setInterval(() => (now.value = Date.now()), 60_000) })
onBeforeUnmount(() => clearInterval(nowTimer))

const lastReceivedDt = computed(() =>
  transactions.value.reduce<number | null>((max, tx) => (max === null || tx.createdDt > max ? tx.createdDt : max), null),
)

type ConnectionState = 'notConnected' | 'waiting' | 'active' | 'stale'

const connectionState = computed<ConnectionState | null>(() => {
  if (isLoading.value || keyStatusLoading.value) return null
  if (lastReceivedDt.value !== null) {
    return now.value - lastReceivedDt.value > STALE_AFTER_MS ? 'stale' : 'active'
  }
  return ssKeyStatus.value.hasKey ? 'waiting' : 'notConnected'
})

const relativeTimeFormat = computed(() => new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' }))

const lastReceivedAgo = computed(() => {
  if (lastReceivedDt.value === null) return ''
  const diffSec = Math.round((lastReceivedDt.value - now.value) / 1000)
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, secs] of units) {
    if (Math.abs(diffSec) >= secs) return relativeTimeFormat.value.format(Math.round(diffSec / secs), unit)
  }
  return t('applepay.connection.justNow')
})

// Once connected, the guide is hidden from the list and only reachable via the
// status chip — it stays mounted while expanded so it can be read/collapsed.
const showSetupGuide = computed(
  () =>
    !keyStatusLoading.value &&
    (!ssKeyStatus.value.hasKey || !!freshlyGeneratedKey.value || setupGuideOpen.value.includes('guide')),
)

const setupGuideEl = ref<HTMLElement | null>(null)

const openSetupGuide = async () => {
  activeTab.value = 'transactions'
  setupGuideOpen.value = ['guide']
  await nextTick()
  setupGuideEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const selectedBankKey = ref(bankGuides[0].key)
const selectedBank = computed(() =>
  bankGuides.find((bank) => bank.key === selectedBankKey.value) ?? bankGuides[0]
)

const activeTab = ref<'transactions' | 'statistics'>('transactions')

const categoryFilter = ref<string>('')

const categoryOptions = computed(() => {
  const used = transactions.value.map((tx) => tx.category?.trim()).filter((c): c is string => !!c)
  return Array.from(new Set([...DEFAULT_APPLEPAY_CATEGORIES, ...used]))
})

// ── Likely duplicates: one Apple Pay tap can be logged by both the NFC
// automation (v1) and the bank SMS (v2). Pair each v1 row with the closest
// unmatched v2 row of the same amount within the window.
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000

const duplicateIds = computed(() => {
  const toCents = (n: number) => Math.round(n * 100)
  const smsRows = transactions.value.filter((tx) => tx.source === 'v2')
  const matched = new Set<string>()
  for (const tap of transactions.value) {
    if (tap.source !== 'v1') continue
    let best: ApplePayTransaction | null = null
    for (const sms of smsRows) {
      if (matched.has(sms.id) || toCents(sms.amount) !== toCents(tap.amount)) continue
      const gap = Math.abs(sms.occurredDt - tap.occurredDt)
      if (gap <= DUPLICATE_WINDOW_MS && (!best || gap < Math.abs(best.occurredDt - tap.occurredDt))) best = sms
    }
    if (best) {
      matched.add(best.id)
      matched.add(tap.id)
    }
  }
  return matched
})

const duplicatePairCount = computed(() => duplicateIds.value.size / 2)
const showDuplicatesOnly = ref(false)

const byCategory = (rows: ApplePayTransaction[]) =>
  categoryFilter.value ? rows.filter((tx) => (tx.category ?? '') === categoryFilter.value) : rows

// The list follows the month picked in the summary card; duplicate review
// ignores the month since the banner counts pairs across all of them.
const filteredTransactions = computed(() =>
  showDuplicatesOnly.value
    ? byCategory(transactions.value.filter((tx) => duplicateIds.value.has(tx.id)))
    : byCategory(monthTransactions.value),
)

// ── Remove a transaction (soft delete server-side) ──
const deletingId = ref<string | null>(null)

const onDeleteTransaction = async (tx: ApplePayTransaction) => {
  deletingId.value = tx.id
  const ok = await store.deleteTransaction(tx.id)
  deletingId.value = null
  if (!ok) return toast.error(t('applepay.deleteFailed'))
  toast.success(t('applepay.deleted'))
  if (showDuplicatesOnly.value && duplicatePairCount.value === 0) showDuplicatesOnly.value = false
}

// ── Manual entry (cash, missed alerts) ──
const addDialogVisible = ref(false)
const addSaving = ref(false)
const addForm = ref({ amount: undefined as number | undefined, merchant: '', occurredAt: new Date(), category: '' })

const openAddDialog = () => {
  addForm.value = { amount: undefined, merchant: '', occurredAt: new Date(), category: '' }
  addDialogVisible.value = true
}

const canSubmitAdd = computed(
  () => !!addForm.value.amount && addForm.value.amount > 0 && !!addForm.value.merchant.trim() && !!addForm.value.occurredAt,
)

const disableFutureDates = (d: Date) => d.getTime() > Date.now()

const submitAdd = async () => {
  if (!canSubmitAdd.value) return
  addSaving.value = true
  const ok = await store.addTransaction({
    amount: addForm.value.amount!,
    merchant: addForm.value.merchant.trim(),
    occurredDt: addForm.value.occurredAt.getTime(),
    category: addForm.value.category.trim() || null,
  })
  addSaving.value = false
  if (!ok) return toast.error(t('applepay.add.failed'))
  toast.success(t('applepay.add.success'))
  addDialogVisible.value = false
}

// ── CSV export of whatever the list currently shows ──
// Leading = + - @ would be evaluated as formulas by Excel/Sheets; merchant text
// comes from bank SMS, so neutralise it with a leading apostrophe.
const csvCell = (value: string | number) => {
  let s = String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const exportCsv = () => {
  const header = ['Date', 'Merchant', 'Amount', 'Currency', 'Category', 'Card / Device', 'Source']
  const rows = filteredTransactions.value.map((tx) => [
    new Date(tx.occurredDt).toISOString(),
    tx.merchant,
    tx.amount.toFixed(2),
    CURRENCY,
    tx.category ?? '',
    tx.name ?? tx.cardLabel ?? (tx.cardLast4 ? `•• ${tx.cardLast4}` : ''),
    sourceLabel(tx.source),
  ])
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
  // BOM so Excel opens UTF-8 merchant names correctly
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const scope = showDuplicatesOnly.value ? 'duplicates' : dayKey(calendarMonth.value).slice(0, 7)
  a.download = `transactions-${scope}.csv`
  a.click()
  URL.revokeObjectURL(url)
}


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
const sourceLabel = (source: string) =>
  source === 'v2' ? t('applepay.sourceSms') : source === 'manual' ? t('applepay.sourceManual') : t('applepay.sourceNfc')
const sourceTagType = (source: string) => (source === 'v2' ? 'success' : source === 'manual' ? 'warning' : 'info')

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

// ── Summary card (Transactions tab): month total, change vs last month, and
// a daily-spend sparkline — all respecting the category filter.
const sumAmounts = (rows: ApplePayTransaction[]) => rows.reduce((sum, tx) => sum + tx.amount, 0)

const summaryRows = computed(() => byCategory(monthTransactions.value))
const summaryTotal = computed(() => sumAmounts(summaryRows.value))

const previousMonthTotal = computed(() => {
  const prev = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() - 1, 1)
  const rows = transactions.value.filter((tx) => {
    const d = new Date(tx.occurredDt)
    return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth()
  })
  return sumAmounts(byCategory(rows))
})

const previousMonthShortLabel = computed(() =>
  new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() - 1, 1).toLocaleDateString(locale.value, {
    month: 'short',
  }),
)

// null when there's nothing to compare against (no spend last month)
const monthDeltaPct = computed(() => {
  if (previousMonthTotal.value <= 0) return null
  return Math.round(((summaryTotal.value - previousMonthTotal.value) / previousMonthTotal.value) * 100)
})

const isCurrentMonth = computed(() => {
  const today = new Date()
  return (
    calendarMonth.value.getFullYear() === today.getFullYear() && calendarMonth.value.getMonth() === today.getMonth()
  )
})

const sparkDays = computed(() => {
  const y = calendarMonth.value.getFullYear()
  const m = calendarMonth.value.getMonth()
  const todayKey = dayKey(new Date())
  const totals = new Map<string, number>()
  for (const tx of summaryRows.value) {
    const key = dayKey(new Date(tx.occurredDt))
    totals.set(key, (totals.get(key) ?? 0) + tx.amount)
  }
  const max = Math.max(0, ...totals.values())
  return Array.from({ length: daysInCalendarMonth.value }, (_, i) => {
    const date = new Date(y, m, i + 1)
    const key = dayKey(date)
    const total = totals.get(key) ?? 0
    return {
      key,
      total,
      heightPct: max > 0 ? (total / max) * 100 : 0,
      isToday: key === todayKey,
      isFuture: date.getTime() > Date.now(),
      label: `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: ${formatAmount(total)}`,
    }
  })
})
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
  tx.name ??
  tx.cardLabel ??
  (tx.cardLast4 ? `•• ${tx.cardLast4}` : tx.source === 'manual' ? t('applepay.sourceManual') : t('applepay.stats.uncategorized'))

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
    <header class="list-header">
      <div class="list-heading">
        <el-button circle size="small" class="list-back" :aria-label="t('common.back')" @click="nav.redirectToDashboard()">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <div>
          <p class="list-eyebrow">{{ t('applepay.eyebrow') }}</p>
          <h1 class="list-title">{{ t('applepay.title') }}</h1>
          <p class="list-subtitle">{{ t('applepay.subtitle') }}</p>
        </div>
      </div>

      <button
        v-if="connectionState"
        type="button"
        class="connection-status"
        :class="`connection-status--${connectionState}`"
        :title="t('applepay.connection.openGuide')"
        @click="openSetupGuide"
      >
        <span class="connection-dot" aria-hidden="true" />
        <span class="connection-text">
          <span class="connection-label">{{ t(`applepay.connection.${connectionState}`) }}</span>
          <span v-if="connectionState === 'stale'" class="connection-sub">
            {{ t('applepay.connection.lastReceivedStale', { days: STALE_AFTER_DAYS }) }}
          </span>
          <span v-else-if="lastReceivedDt !== null" class="connection-sub">
            {{ t('applepay.connection.lastReceived', { ago: lastReceivedAgo }) }}
          </span>
          <span v-else class="connection-sub">{{ t(`applepay.connection.${connectionState}Hint`) }}</span>
        </span>
      </button>
    </header>

    <el-tabs v-model="activeTab">
      <el-tab-pane :label="t('applepay.tabs.transactions')" name="transactions">
        <div v-if="showSetupGuide" ref="setupGuideEl" class="setup-guide-anchor">
        <el-collapse v-model="setupGuideOpen" class="setup-guide">
          <el-collapse-item name="guide">
            <template #title>
              <span class="setup-guide-title">{{ t('applepay.setup.title') }}</span>
              <el-tag v-if="!ssKeyStatus.hasKey" type="warning" size="small" effect="light" class="setup-guide-badge">
                {{ t('applepay.setup.badgeRequired') }}
              </el-tag>
              <el-tag v-else type="success" size="small" effect="plain" class="setup-guide-badge">
                {{ t('applepay.setup.badgeDone') }}
              </el-tag>
            </template>

            <ol class="setup-steps">
              <li>
                <strong>{{ t('applepay.setup.step1Title') }}</strong>
                <p>{{ t('applepay.setup.step1Desc') }}</p>

                <el-button v-if="!ssKeyStatus.hasKey" type="primary" size="small" :loading="keyGenerating" @click="handleGenerateKey">
                  {{ t('applepay.setup.generateKey') }}
                </el-button>
                <span v-else class="setup-step-done">
                  ✓ {{ t('applepay.setup.keyReady', { name: ssKeyStatus.name ?? t('ssKey.unnamed'), hint: ssKeyStatus.keyHint ?? '?????' }) }}
                  <a class="setup-manage-link" @click="nav.redirectTo('/ss-key')">{{ t('applepay.setup.manageKey') }}</a>
                </span>

                <div v-if="freshlyGeneratedKey" class="fresh-key-banner">
                  <div class="fresh-key-warning">{{ t('toast.ssKeyWarning') }}</div>
                  <div class="key-reveal-row">
                    <el-input :model-value="freshlyGeneratedKey" readonly class="key-input" />
                    <el-button type="primary" :icon="CopyDocument" @click="copyGeneratedKey">{{ t('ssKey.copy') }}</el-button>
                  </div>
                </div>
              </li>

              <li>
                <strong>{{ t('applepay.setup.step2Title') }}</strong>
                <p>{{ t('applepay.setup.step2Desc') }}</p>

                <el-radio-group v-model="selectedBankKey" size="small" class="bank-guide-selector">
                  <el-radio-button v-for="bank in bankGuides" :key="bank.key" :value="bank.key">
                    {{ bank.name }}
                  </el-radio-button>
                </el-radio-group>

                <div class="bank-guide">
                  <template v-if="selectedBank.images.length">
                    <figure v-for="image in selectedBank.images" :key="image.captionKey" class="setup-guide-image">
                      <img :src="image.src" :alt="t(image.captionKey)" />
                      <figcaption>{{ t(image.captionKey) }}</figcaption>
                    </figure>
                  </template>
                  <p v-else class="bank-guide-image-pending">{{ t('applepay.setup.bankImagePending') }}</p>

                  <a :href="selectedBank.shortcutUrl" target="_blank" rel="noopener" class="bank-guide-shortcut-link">
                    {{ t('applepay.setup.bankShortcutLink', { bank: selectedBank.name }) }}
                  </a>
                </div>
              </li>

              <li>
                <strong>{{ t('applepay.setup.step3Title') }}</strong>
                <p>{{ t('applepay.setup.step3Desc') }}</p>
                <div class="endpoint-row">
                  <span class="endpoint-method">POST</span>
                  <code class="endpoint-path">{{ serverBaseUrl }}/v2/ss/ap/sms</code>
                </div>
                <p class="setup-substep">{{ t('applepay.setup.step3Header') }} <code>x-api-key: &lt;{{ t('applepay.setup.yourKey') }}&gt;</code></p>
                <p class="setup-substep">{{ t('applepay.setup.step3Body') }} <code>{ "smsBody": "..." }</code></p>

                <figure class="setup-guide-image">
                  <img :src="apiKeyHeaderImage" :alt="t('applepay.setup.apiKeyImageCaption')" />
                  <figcaption>{{ t('applepay.setup.apiKeyImageCaption') }}</figcaption>
                </figure>
              </li>

              <li>
                <strong>{{ t('applepay.setup.step4Title') }}</strong>
                <p>{{ t('applepay.setup.step4Desc') }}</p>
              </li>
            </ol>
          </el-collapse-item>
        </el-collapse>
        </div>

        <section class="month-summary">
          <div class="month-summary-nav">
            <el-button circle size="small" text :aria-label="t('applepay.summary.prevMonth')" @click="shiftMonth(-1)">
              <el-icon><ArrowLeft /></el-icon>
            </el-button>
            <span class="month-summary-month">{{ monthLabel }}</span>
            <el-button
              circle
              size="small"
              text
              :disabled="isCurrentMonth"
              :aria-label="t('applepay.summary.nextMonth')"
              @click="shiftMonth(1)"
            >
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>

          <div class="month-summary-figures">
            <div class="month-summary-main">
              <span class="month-summary-label">
                {{ categoryFilter ? t('applepay.summary.spentOn', { category: categoryFilter }) : t('applepay.summary.spent') }}
              </span>
              <span class="month-summary-value">{{ formatAmount(summaryTotal) }}</span>
            </div>
            <div class="month-summary-meta">
              <span>{{ t('applepay.summary.payments', summaryRows.length) }}</span>
              <span
                v-if="monthDeltaPct !== null"
                class="month-summary-delta"
                :class="monthDeltaPct > 0 ? 'month-summary-delta--up' : monthDeltaPct < 0 ? 'month-summary-delta--down' : ''"
              >
                {{ monthDeltaPct > 0 ? '▲' : monthDeltaPct < 0 ? '▼' : '' }}
                {{ t('applepay.summary.vsLast', { pct: Math.abs(monthDeltaPct), month: previousMonthShortLabel }) }}
              </span>
            </div>
          </div>

          <div class="month-spark" role="img" :aria-label="t('applepay.summary.sparkLabel')">
            <div
              v-for="day in sparkDays"
              :key="day.key"
              class="month-spark-col"
              :title="day.isFuture ? undefined : day.label"
            >
              <span
                class="month-spark-bar"
                :class="{
                  'month-spark-bar--today': day.isToday,
                  'month-spark-bar--empty': day.total === 0,
                  'month-spark-bar--future': day.isFuture,
                }"
                :style="day.total > 0 ? { height: `max(3px, ${day.heightPct}%)` } : undefined"
              />
            </div>
          </div>
        </section>

        <div v-if="duplicatePairCount > 0" class="duplicate-banner">
          <span>{{ t('applepay.duplicates.found', duplicatePairCount) }}</span>
          <el-button size="small" link type="warning" @click="showDuplicatesOnly = !showDuplicatesOnly">
            {{ showDuplicatesOnly ? t('applepay.duplicates.showAll') : t('applepay.duplicates.review') }}
          </el-button>
        </div>

        <div class="filter-row">
          <el-select v-model="categoryFilter" clearable :placeholder="t('applepay.allCategories')" class="category-filter">
            <el-option v-for="opt in categoryOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <div class="filter-actions">
            <el-button
              :icon="Download"
              :disabled="filteredTransactions.length === 0"
              :title="t('applepay.exportCsv')"
              :aria-label="t('applepay.exportCsv')"
              @click="exportCsv"
            >
              <span class="filter-action-text">{{ t('applepay.exportCsv') }}</span>
            </el-button>
            <el-button
              type="primary"
              :icon="Plus"
              :title="t('applepay.add.button')"
              :aria-label="t('applepay.add.button')"
              @click="openAddDialog"
            >
              <span class="filter-action-text">{{ t('applepay.add.button') }}</span>
            </el-button>
          </div>
        </div>

        <div v-if="isLoading" class="loading-state">
          <el-skeleton :rows="6" animated />
        </div>

        <div v-else-if="filteredTransactions.length === 0" class="empty-text">
          {{ transactions.length === 0 ? t('applepay.noTransactions') : t('applepay.summary.emptyMonth', { month: monthLabel }) }}
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
            <el-table-column :label="t('applepay.col.source')" width="110">
              <template #default="{ row }">
                <div class="source-cell">
                  <el-tag size="small" :type="sourceTagType(row.source)">{{ sourceLabel(row.source) }}</el-tag>
                  <el-tag v-if="duplicateIds.has(row.id)" size="small" type="warning" effect="plain">
                    {{ t('applepay.duplicates.tag') }}
                  </el-tag>
                </div>
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
            <el-table-column width="56" align="center">
              <template #default="{ row }">
                <el-popconfirm
                  :title="t('applepay.deleteConfirm')"
                  :confirm-button-text="t('applepay.deleteAction')"
                  :cancel-button-text="t('common.cancel')"
                  confirm-button-type="danger"
                  width="220"
                  @confirm="onDeleteTransaction(row)"
                >
                  <template #reference>
                    <el-button
                      :icon="Delete"
                      size="small"
                      text
                      circle
                      :loading="deletingId === row.id"
                      :aria-label="t('applepay.deleteAction')"
                    />
                  </template>
                </el-popconfirm>
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
                <el-tag size="small" :type="sourceTagType(row.source)" class="tx-card-source">{{ sourceLabel(row.source) }}</el-tag>
                <el-tag v-if="duplicateIds.has(row.id)" size="small" type="warning" effect="plain">
                  {{ t('applepay.duplicates.tag') }}
                </el-tag>
              </div>
              <div class="tx-card-bottom">
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
                <el-popconfirm
                  :title="t('applepay.deleteConfirm')"
                  :confirm-button-text="t('applepay.deleteAction')"
                  :cancel-button-text="t('common.cancel')"
                  confirm-button-type="danger"
                  width="220"
                  @confirm="onDeleteTransaction(row)"
                >
                  <template #reference>
                    <el-button
                      :icon="Delete"
                      text
                      circle
                      :loading="deletingId === row.id"
                      :aria-label="t('applepay.deleteAction')"
                    />
                  </template>
                </el-popconfirm>
              </div>
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

    <el-dialog v-model="addDialogVisible" :title="t('applepay.add.title')" width="min(420px, 92vw)" append-to-body>
      <el-form label-position="top" @submit.prevent="submitAdd">
        <el-form-item :label="t('applepay.add.amount')" required>
          <el-input-number
            v-model="addForm.amount"
            :min="0.01"
            :max="99999999.99"
            :precision="2"
            :step="1"
            :controls="false"
            class="add-amount-input"
            :placeholder="'0.00'"
          />
        </el-form-item>
        <el-form-item :label="t('applepay.add.merchant')" required>
          <el-input v-model="addForm.merchant" maxlength="255" :placeholder="t('applepay.add.merchantPlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('applepay.add.date')" required>
          <el-date-picker
            v-model="addForm.occurredAt"
            type="datetime"
            :clearable="false"
            :disabled-date="disableFutureDates"
            format="DD MMM YYYY HH:mm"
            class="add-date-input"
          />
        </el-form-item>
        <el-form-item :label="t('applepay.col.category')">
          <el-select
            v-model="addForm.category"
            filterable
            allow-create
            default-first-option
            clearable
            :placeholder="t('applepay.setCategory')"
            class="add-category-input"
          >
            <el-option v-for="opt in categoryOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <p class="add-hint">{{ t('applepay.add.hint') }}</p>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="addSaving" :disabled="!canSubmitAdd" @click="submitAdd">
          {{ t('applepay.add.save') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.list-heading {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.list-back {
  flex-shrink: 0;
  margin-top: 2px;
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

/* ── Connection status chip ─────────────────────────────────────────── */

.connection-status {
  --status-color: var(--el-color-info);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s;
}

.connection-status:hover {
  border-color: var(--status-color);
}

.connection-status--active { --status-color: var(--el-color-success); }
.connection-status--waiting { --status-color: var(--el-color-primary); }
.connection-status--stale { --status-color: var(--el-color-warning); }
.connection-status--notConnected { --status-color: var(--el-color-info); }

.connection-status--stale {
  border-color: var(--el-color-warning-light-5);
  background: var(--el-color-warning-light-9);
}

.connection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--status-color);
  flex-shrink: 0;
}

.connection-status--active .connection-dot {
  box-shadow: 0 0 0 3px var(--el-color-success-light-8);
}

.connection-text {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.connection-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-heading);
}

.connection-sub {
  font-size: 0.74rem;
  opacity: 0.65;
}

/* ── Onboarding / setup guide ───────────────────────────────────────── */

.setup-guide {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;
}

.setup-guide :deep(.el-collapse-item__header) {
  padding: 0 16px;
  border-bottom: none;
  background: var(--color-background-soft);
}

.setup-guide :deep(.el-collapse-item__wrap) {
  border-bottom: none;
  background: var(--color-background-soft);
}

.setup-guide :deep(.el-collapse-item__content) {
  padding: 0 16px 16px;
}

.setup-guide-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-heading);
}

.setup-guide-badge {
  margin-left: 10px;
}

.setup-steps {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setup-steps li strong {
  font-size: 0.85rem;
  color: var(--color-heading);
}

.setup-steps li p {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.7;
  line-height: 1.5;
  margin: 4px 0 8px;
}

.setup-substep {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.65;
  margin: 4px 0 0;
}

.setup-substep code,
.setup-steps li p code {
  background: var(--color-background-mute);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 0.75rem;
  word-break: break-all;
}

.setup-step-done {
  font-size: 0.82rem;
  color: var(--el-color-success);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.setup-manage-link {
  font-weight: 500;
  color: var(--el-color-primary);
  cursor: pointer;
  text-decoration: none;
}

.setup-manage-link:hover {
  text-decoration: underline;
}

.endpoint-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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
  background: var(--color-background-mute);
  border-radius: 4px;
  padding: 1px 5px;
}

.bank-guide-selector {
  margin: 4px 0 10px;
}

.bank-guide {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 320px;
}

.setup-guide-image {
  margin: 8px 0 0;
  max-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setup-guide-image img {
  width: 100%;
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.setup-guide-image figcaption {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.6;
  line-height: 1.4;
}

.bank-guide-image-pending {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.5;
  font-style: italic;
}

.bank-guide-shortcut-link {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--el-color-primary);
  text-decoration: none;
  align-self: flex-start;
}

.bank-guide-shortcut-link:hover {
  text-decoration: underline;
}

.fresh-key-banner {
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-5);
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 10px;
}

.fresh-key-warning {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--el-color-warning-dark-2);
  margin-bottom: 10px;
  line-height: 1.4;
}

.key-reveal-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.key-input {
  font-family: monospace;
  flex: 1;
  min-width: 160px;
}

/* ── Month summary (Transactions tab) ───────────────────────────────── */

.month-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-areas:
    'nav   nav'
    'figs  spark';
  align-items: end;
  gap: 8px 20px;
  padding: 12px 16px 14px;
  border-radius: 14px;
  margin-bottom: 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--el-color-primary-light-7);
}

.month-summary-nav {
  grid-area: nav;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: -6px;
}

.month-summary-nav .el-button + .el-button {
  margin-left: 0;
}

.month-summary-month {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-heading);
  min-width: 118px;
  text-align: center;
}

.month-summary-figures {
  grid-area: figs;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.month-summary-main {
  display: flex;
  flex-direction: column;
}

.month-summary-label {
  font-size: 0.74rem;
  color: var(--color-text);
  opacity: 0.65;
}

.month-summary-value {
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1.15;
  color: var(--color-heading);
  white-space: nowrap;
}

.month-summary-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  font-size: 0.76rem;
  color: var(--color-text);
}

.month-summary-meta > span:first-child {
  opacity: 0.65;
}

.month-summary-delta {
  font-weight: 600;
  opacity: 0.8;
}

/* Spending up is the cautionary direction; the arrow + words carry the
   meaning so colour is never the only cue. */
.month-summary-delta--up {
  color: var(--el-color-danger);
  opacity: 1;
}

.month-summary-delta--down {
  color: var(--el-color-success);
  opacity: 1;
}

.month-spark {
  grid-area: spark;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 44px;
  border-bottom: 1px solid var(--color-border);
}

.month-spark-col {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: flex-end;
}

.month-spark-bar {
  display: block;
  width: 100%;
  border-radius: 2px 2px 0 0;
  background: var(--el-color-primary-light-5);
}

.month-spark-bar--today {
  background: var(--el-color-primary);
}

.month-spark-bar--empty {
  height: 2px;
  background: var(--color-border);
}

.month-spark-bar--future {
  height: 2px;
  background: transparent;
}

.month-spark-col:hover .month-spark-bar:not(.month-spark-bar--empty):not(.month-spark-bar--future) {
  background: var(--el-color-primary);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.filter-actions .el-button + .el-button {
  margin-left: 0;
}

.duplicate-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 12px;
  border-radius: 10px;
  border: 1px solid var(--el-color-warning-light-5);
  background: var(--el-color-warning-light-9);
  font-size: 0.82rem;
  color: var(--color-heading);
}

.source-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.tx-card-bottom {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tx-card-bottom .category-select {
  flex: 1;
  min-width: 0;
}

.add-amount-input,
.add-date-input,
.add-category-input {
  width: 100%;
}

.add-amount-input :deep(.el-input__inner) {
  text-align: left;
}

.add-hint {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.6;
  margin: 0;
}

.setup-guide-anchor {
  scroll-margin-top: 80px;
}

@media (max-width: 640px) {
  .filter-row {
    flex-wrap: nowrap;
    gap: 8px;
  }

  .category-filter {
    flex: 1;
    min-width: 0;
    width: auto;
  }

  /* Icon-only on phones — label stays as title/aria-label */
  .filter-action-text {
    display: none;
  }

  .filter-actions .el-button {
    padding: 8px 11px;
  }

  .filter-actions .el-button :deep([class*='el-icon'] + span) {
    margin-left: 0;
  }
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

@media (max-width: 640px) {
  /* One compact row: back · title · status chip */
  .list-header {
    flex-wrap: nowrap;
    align-items: center;
    gap: 10px;
  }

  .list-heading {
    align-items: center;
    gap: 10px;
  }

  .list-back {
    margin-top: 0;
  }

  .list-eyebrow,
  .list-subtitle {
    display: none;
  }

  .list-title {
    font-size: 1.3rem;
    line-height: 1.2;
  }

  .connection-status {
    margin-left: auto;
    padding: 6px 10px;
    gap: 8px;
    border-radius: 10px;
    flex-shrink: 1;
    min-width: 0;
  }

  .connection-label {
    font-size: 0.76rem;
  }

  .connection-sub {
    font-size: 0.68rem;
  }

  /* Healthy: the dot + "Connected" is enough; keep the detail line only
     when it asks the user to act. */
  .connection-status--active .connection-sub {
    display: none;
  }

  .month-summary {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'nav'
      'figs'
      'spark';
    gap: 6px;
    padding: 10px 12px 12px;
  }

  .month-summary-value {
    font-size: 1.35rem;
  }

  .month-spark {
    height: 32px;
    margin-top: 4px;
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
