<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'

type TransactionType = 'expense' | 'earning'
type ExpenseCategory = 'food' | 'transport' | 'shopping' | 'entertainment' | 'utilities' | 'health' | 'other'
type EarningCategory = 'salary' | 'freelance' | 'investment' | 'gift' | 'other'

interface Transaction {
  id: number
  type: TransactionType
  amount: number
  description: string
  category: string
  date: string
  notes: string | null
  cardId: number | null
  createdAt: number
}

interface CreditCard {
  id: number
  name: string
  cycleEndDay: number  // day of month cycle ends (1–28)
  dueDay: number       // day of month payment is due (of month after cycle end)
  color: string
}

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: 'food', label: 'Food & Drink', icon: '🍜' },
  { value: 'transport', label: 'Transport', icon: '🚌' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎮' },
  { value: 'utilities', label: 'Utilities', icon: '💡' },
  { value: 'health', label: 'Health', icon: '💊' },
  { value: 'other', label: 'Other', icon: '📦' },
]

const EARNING_CATEGORIES: { value: EarningCategory; label: string; icon: string }[] = [
  { value: 'salary', label: 'Salary', icon: '💼' },
  { value: 'freelance', label: 'Freelance', icon: '🖥️' },
  { value: 'investment', label: 'Investment', icon: '📈' },
  { value: 'gift', label: 'Gift', icon: '🎁' },
  { value: 'other', label: 'Other', icon: '📦' },
]

const CATEGORY_COLORS: Record<string, string> = {
  food: '#f97316', transport: '#3b82f6', shopping: '#a855f7',
  entertainment: '#ec4899', utilities: '#eab308', health: '#22c55e', other: '#94a3b8',
}

const CARD_COLOR_PRESETS = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261', '#9b5de5']

function getCategoryIcon(type: TransactionType, category: string): string {
  const list = type === 'expense' ? EXPENSE_CATEGORIES : EARNING_CATEGORIES
  return list.find((c) => c.value === category)?.icon ?? '📦'
}

function getCategoryLabel(type: TransactionType, category: string): string {
  const list = type === 'expense' ? EXPENSE_CATEGORIES : EARNING_CATEGORIES
  return list.find((c) => c.value === category)?.label ?? 'Other'
}

// ─── Credit Cards ────────────────────────────────────────────────────────────

const creditCards = ref<CreditCard[]>([])

function getCardById(id: number): CreditCard | undefined {
  return creditCards.value.find((c) => c.id === id)
}
function getCardName(id: number): string {
  return getCardById(id)?.name ?? ''
}
function getCardColor(id: number): string {
  return getCardById(id)?.color ?? '#94a3b8'
}

// Billing cycle helpers
function getCardDueDate(card: CreditCard, today: Date): Date {
  const day = today.getDate()
  const m = today.getMonth()
  const y = today.getFullYear()
  // If today ≤ cycleEndDay: cycle ends this month, payment due next month
  // If today > cycleEndDay: cycle ends next month, payment due month after
  return day <= card.cycleEndDay
    ? new Date(y, m + 1, card.dueDay)
    : new Date(y, m + 2, card.dueDay)
}

function getCardCycleStart(card: CreditCard, today: Date): Date {
  const day = today.getDate()
  const m = today.getMonth()
  const y = today.getFullYear()
  return day <= card.cycleEndDay
    ? new Date(y, m - 1, card.cycleEndDay + 1)
    : new Date(y, m, card.cycleEndDay + 1)
}

function getCardCycleBill(card: CreditCard, today: Date): number {
  const cycleStart = getCardCycleStart(card, today)
  return transactions.value
    .filter((t) => t.type === 'expense' && t.cardId === card.id)
    .filter((t) => new Date(t.date + 'T00:00:00') >= cycleStart)
    .reduce((s, t) => s + t.amount, 0)
}

function formatDueDate(d: Date): string {
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

// ─── Transactions ─────────────────────────────────────────────────────────────

const transactions = ref<Transaction[]>([])

// ─── Balance & Projection ────────────────────────────────────────────────────

const isLoading = ref(false)
const currentBalance = ref(0)
const editingBalance = ref(false)
const balanceInput = ref(0)

function startEditBalance() {
  balanceInput.value = currentBalance.value
  editingBalance.value = true
}
async function saveBalance() {
  if (balanceInput.value != null && balanceInput.value >= 0) {
    try {
      await HttpClient.post(ApiRoute.EXPENSE.UPDATE_BALANCE, { balance: balanceInput.value })
      currentBalance.value = balanceInput.value
    } catch { ElMessage.error('Failed to save balance') }
  }
  editingBalance.value = false
}

const cardProjections = computed(() => {
  const today = new Date()
  const rows = creditCards.value.map((card) => ({
    card,
    bill: getCardCycleBill(card, today),
    dueDate: getCardDueDate(card, today),
  })).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

  let running = currentBalance.value
  return rows.map((p) => {
    running -= p.bill
    return { ...p, projectedAfter: running }
  })
})

const projectedBalance = computed(() =>
  cardProjections.value.length > 0
    ? cardProjections.value[cardProjections.value.length - 1].projectedAfter
    : currentBalance.value
)

// ─── Card Manager ────────────────────────────────────────────────────────────

const showCardManager = ref(false)
const cardManagerMode = ref<'list' | 'form'>('list')
const editingCard = ref<CreditCard | null>(null)
const cardForm = ref({ name: '', cycleEndDay: 25, dueDay: 15, color: CARD_COLOR_PRESETS[0] })

const canSaveCard = computed(() =>
  !!cardForm.value.name.trim() &&
  cardForm.value.cycleEndDay >= 1 && cardForm.value.cycleEndDay <= 28 &&
  cardForm.value.dueDay >= 1 && cardForm.value.dueDay <= 28
)

function openAddCard() {
  editingCard.value = null
  cardForm.value = { name: '', cycleEndDay: 25, dueDay: 15, color: CARD_COLOR_PRESETS[0] }
  cardManagerMode.value = 'form'
  showCardManager.value = true
}

function openEditCard(card: CreditCard) {
  editingCard.value = card
  cardForm.value = { name: card.name, cycleEndDay: card.cycleEndDay, dueDay: card.dueDay, color: card.color }
  cardManagerMode.value = 'form'
}

async function saveCard() {
  if (!canSaveCard.value) return
  const payload = { name: cardForm.value.name.trim(), cycleEndDay: cardForm.value.cycleEndDay, dueDay: cardForm.value.dueDay, color: cardForm.value.color }
  try {
    if (editingCard.value) {
      const { data } = await HttpClient.post(ApiRoute.EXPENSE.UPDATE_CARD, { id: editingCard.value.id, ...payload })
      const idx = creditCards.value.findIndex((c) => c.id === editingCard.value!.id)
      if (idx !== -1) creditCards.value[idx] = data.data
      ElMessage.success('Card updated')
    } else {
      const { data } = await HttpClient.post(ApiRoute.EXPENSE.CREATE_CARD, payload)
      creditCards.value.push(data.data)
      ElMessage.success('Card added')
    }
    cardManagerMode.value = 'list'
    editingCard.value = null
  } catch { ElMessage.error('Failed to save card') }
}

async function deleteCard(id: number) {
  try {
    await HttpClient.post(ApiRoute.EXPENSE.DELETE_CARD, { id })
    creditCards.value = creditCards.value.filter((c) => c.id !== id)
    transactions.value = transactions.value.map((t) => t.cardId === id ? { ...t, cardId: null } : t)
    ElMessage.success('Card removed')
  } catch { ElMessage.error('Failed to delete card') }
}

// ─── View / Month ────────────────────────────────────────────────────────────

const viewMode = ref<'transactions' | 'charts'>('transactions')
const currentMonth = ref({ year: 2026, month: 3 })

function shiftMonth(delta: number) {
  let { year, month } = currentMonth.value
  month += delta
  if (month > 12) { month = 1; year++ }
  if (month < 1) { month = 12; year-- }
  currentMonth.value = { year, month }
}

function goToThisMonth() {
  const now = new Date()
  currentMonth.value = { year: now.getFullYear(), month: now.getMonth() + 1 }
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = computed(() => `${MONTH_NAMES[currentMonth.value.month - 1]} ${currentMonth.value.year}`)

// ─── Transactions ────────────────────────────────────────────────────────────

const filter = ref<'all' | 'expense' | 'earning'>('all')

const monthTransactions = computed(() => {
  const { year, month } = currentMonth.value
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return transactions.value
    .filter((t) => t.date.startsWith(prefix))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
})

const filteredTransactions = computed(() => {
  if (filter.value === 'all') return monthTransactions.value
  return monthTransactions.value.filter((t) => t.type === filter.value)
})

const dayTotals = computed(() => {
  const map: Record<string, { expense: number; earning: number }> = {}
  for (const t of monthTransactions.value) {
    if (!map[t.date]) map[t.date] = { expense: 0, earning: 0 }
    map[t.date][t.type] += t.amount
  }
  return map
})

const groupedTransactions = computed(() => {
  const groups: { date: string; items: Transaction[] }[] = []
  for (const t of filteredTransactions.value) {
    const last = groups[groups.length - 1]
    if (last && last.date === t.date) last.items.push(t)
    else groups.push({ date: t.date, items: [t] })
  }
  return groups
})

const totalIn  = computed(() => monthTransactions.value.filter((t) => t.type === 'earning').reduce((s, t) => s + t.amount, 0))
const totalOut = computed(() => monthTransactions.value.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
const balance  = computed(() => transactions.value.reduce((s, t) => t.type === 'earning' ? s + t.amount : s - t.amount, 0))
const netThisMonth = computed(() => totalIn.value - totalOut.value)
const savingsRate   = computed(() => totalIn.value > 0 ? Math.round((netThisMonth.value / totalIn.value) * 100) : null)

function formatAmount(n: number): string {
  return n.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === -1) return 'Yesterday'
  return d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Tap-to-expand
const expandedId = ref<number | null>(null)
function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

// ─── Add / Edit Transaction ──────────────────────────────────────────────────

const showDialog   = ref(false)
const isEditing    = ref(false)
const editingTxId  = ref<number | null>(null)
const confirmDeleteId = ref<number | null>(null)

const defaultForm = () => ({
  type: 'expense' as TransactionType,
  amount: null as number | null,
  description: '',
  category: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
  cardId: null as number | null,
})
const form = ref(defaultForm())

const currentCategories = computed(() =>
  form.value.type === 'expense' ? EXPENSE_CATEGORIES : EARNING_CATEGORIES
)

function openAdd(type: TransactionType) {
  isEditing.value = false
  editingTxId.value = null
  form.value = { ...defaultForm(), type }
  showDialog.value = true
}

function openEdit(t: Transaction) {
  isEditing.value = true
  editingTxId.value = t.id
  expandedId.value = null
  form.value = { type: t.type, amount: t.amount, description: t.description, category: t.category, date: t.date, notes: t.notes ?? '', cardId: t.cardId }
  showDialog.value = true
}

const canSubmit = computed(() =>
  !!form.value.description.trim() && !!form.value.amount && form.value.amount > 0 &&
  !!form.value.category && !!form.value.date
)

async function submitForm() {
  if (!canSubmit.value) return
  const cardId = form.value.type === 'expense' ? form.value.cardId : null
  const payload = { type: form.value.type, amount: form.value.amount!, description: form.value.description.trim(), category: form.value.category, date: form.value.date, notes: form.value.notes.trim() || null, cardId }
  try {
    if (isEditing.value && editingTxId.value !== null) {
      const { data } = await HttpClient.post(ApiRoute.EXPENSE.UPDATE_TRANSACTION, { id: editingTxId.value, ...payload })
      const idx = transactions.value.findIndex((t) => t.id === editingTxId.value)
      if (idx !== -1) transactions.value[idx] = data.data
      ElMessage.success('Transaction updated')
    } else {
      const { data } = await HttpClient.post(ApiRoute.EXPENSE.CREATE_TRANSACTION, payload)
      transactions.value.unshift(data.data)
      ElMessage.success('Transaction added')
    }
    showDialog.value = false
  } catch { ElMessage.error('Failed to save transaction') }
}

function openDelete(id: number) { expandedId.value = null; confirmDeleteId.value = id }
function cancelDelete() { confirmDeleteId.value = null }
async function confirmDelete(id: number) {
  try {
    await HttpClient.post(ApiRoute.EXPENSE.DELETE_TRANSACTION, { id })
    transactions.value = transactions.value.filter((t) => t.id !== id)
    confirmDeleteId.value = null
    ElMessage.success('Transaction deleted')
  } catch { ElMessage.error('Failed to delete transaction') }
}

// ─── Charts ──────────────────────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function donutArcPath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number): string {
  const oS = polarToXY(cx, cy, outerR, startDeg), oE = polarToXY(cx, cy, outerR, endDeg)
  const iS = polarToXY(cx, cy, innerR, startDeg), iE = polarToXY(cx, cy, innerR, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return [`M ${oS.x.toFixed(2)} ${oS.y.toFixed(2)}`, `A ${outerR} ${outerR} 0 ${large} 1 ${oE.x.toFixed(2)} ${oE.y.toFixed(2)}`, `L ${iE.x.toFixed(2)} ${iE.y.toFixed(2)}`, `A ${innerR} ${innerR} 0 ${large} 0 ${iS.x.toFixed(2)} ${iS.y.toFixed(2)}`, 'Z'].join(' ')
}

const categoryBreakdown = computed(() => {
  const totals: Record<string, number> = {}
  for (const t of monthTransactions.value.filter((t) => t.type === 'expense')) {
    totals[t.category] = (totals[t.category] ?? 0) + t.amount
  }
  const total = Object.values(totals).reduce((s, v) => s + v, 0)
  return Object.entries(totals).map(([category, amount]) => {
    const cat = EXPENSE_CATEGORIES.find((c) => c.value === category)
    return { category, label: cat?.label ?? 'Other', icon: cat?.icon ?? '📦', color: CATEGORY_COLORS[category] ?? '#94a3b8', amount, pct: total > 0 ? Math.round((amount / total) * 100) : 0 }
  }).sort((a, b) => b.amount - a.amount)
})

const donutArcs = computed(() => {
  if (!categoryBreakdown.value.length) return []
  const single = categoryBreakdown.value.length === 1
  let start = 0
  return categoryBreakdown.value.map((cat) => {
    const sweep = single ? 360 : (cat.amount / totalOut.value) * 360
    const path = donutArcPath(100, 100, 78, 50, start, start + sweep - (single ? 0 : 1))
    start += sweep
    return { ...cat, path, single }
  })
})

const dailyBreakdown = computed(() => {
  const { year, month } = currentMonth.value
  const days = new Date(year, month, 0).getDate()
  const map: Record<string, { expense: number; earning: number }> = {}
  for (const t of monthTransactions.value) {
    if (!map[t.date]) map[t.date] = { expense: 0, earning: 0 }
    if (t.type === 'expense') map[t.date].expense += t.amount
    else map[t.date].earning += t.amount
  }
  return Array.from({ length: days }, (_, i) => {
    const d = i + 1
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return { day: d, expense: map[dateStr]?.expense ?? 0, earning: map[dateStr]?.earning ?? 0 }
  })
})

const BAR = { vw: 560, vh: 180, pt: 10, pr: 10, pb: 36, pl: 44 }
const bW = computed(() => BAR.vw - BAR.pl - BAR.pr)
const bH = computed(() => BAR.vh - BAR.pt - BAR.pb)
const bMax = computed(() => Math.max(...dailyBreakdown.value.flatMap((d) => [d.expense, d.earning]), 1))
const bGrid = computed(() => { const nice = Math.ceil(bMax.value / 100) * 100; return [0, nice / 2, nice] })
const barSlots = computed(() => {
  const n = dailyBreakdown.value.length; if (!n) return []
  const slotW = bW.value / n, barW = Math.max(3, Math.min(10, slotW * 0.35)), gap = 1
  const nice = Math.ceil(bMax.value / 100) * 100 || 1
  return dailyBreakdown.value.map((d, i) => {
    const cx = BAR.pl + (i + 0.5) * slotW
    const eH = (d.expense / nice) * bH.value, rH = (d.earning / nice) * bH.value
    return {
      day: d.day,
      expBar: d.expense > 0 ? { x: cx - barW - gap / 2, y: BAR.pt + bH.value - eH, w: barW, h: eH } : null,
      ernBar: d.earning > 0 ? { x: cx + gap / 2, y: BAR.pt + bH.value - rH, w: barW, h: rH } : null,
      lx: cx, ly: BAR.vh - 6, label: d.day === 1 || d.day % 5 === 0,
    }
  })
})

// ─── Balance Calendar ─────────────────────────────────────────────────────────

interface TimelinePoint {
  date: string
  balance: number
  isFuture: boolean
  card: CreditCard | null
}

interface CalendarDay {
  date: string | null
  day: number
  balance: number | null
  isFuture: boolean
  isToday: boolean
  isCurrentMonth: boolean
  card: CreditCard | null
}

const balanceTimeline = computed((): TimelinePoint[] => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = new Date(currentMonth.value.year, currentMonth.value.month - 1, 1)

  const latestDue = cardProjections.value.reduce(
    (max, p) => p.dueDate > max ? p.dueDate : max,
    today,
  )
  // Extend to cover the full current month even if no CC cards
  const lastOfMonth = new Date(currentMonth.value.year, currentMonth.value.month, 0)
  const end = new Date(Math.max(latestDue.getTime() + 5 * 86400000, lastOfMonth.getTime()))

  // Build delta map: date → net cash flow
  const delta: Record<string, number> = {}
  for (const t of transactions.value) {
    delta[t.date] = (delta[t.date] ?? 0) + (t.type === 'earning' ? t.amount : -t.amount)
  }
  // Add CC bills on their due dates as large negatives
  for (const p of cardProjections.value) {
    const ds = p.dueDate.toISOString().slice(0, 10)
    delta[ds] = (delta[ds] ?? 0) - p.bill
  }

  const todayStr = today.toISOString().slice(0, 10)

  // Collect forward: today → end
  const forward: TimelinePoint[] = []
  let d = new Date(today)
  let running = currentBalance.value
  while (d <= end) {
    const ds = d.toISOString().slice(0, 10)
    if (ds !== todayStr) running += (delta[ds] ?? 0)
    const card = cardProjections.value.find((p) => p.dueDate.toISOString().slice(0, 10) === ds)?.card ?? null
    forward.push({ date: ds, balance: running, isFuture: d > today, card })
    d = new Date(d.getTime() + 86400000)
  }

  // Collect backward: yesterday → start
  d = new Date(today.getTime() - 86400000)
  running = currentBalance.value
  const back: TimelinePoint[] = []
  while (d >= start) {
    const ds = d.toISOString().slice(0, 10)
    running -= (delta[ds] ?? 0)
    back.unshift({ date: ds, balance: running, isFuture: false, card: null })
    d = new Date(d.getTime() - 86400000)
  }

  return [...back, ...forward]
})

const calendarDays = computed((): CalendarDay[] => {
  const { year, month } = currentMonth.value
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)

  const balanceMap = new Map(balanceTimeline.value.map((p) => [p.date, p]))

  // Monday-first: Sun(0)→6, Mon(1)→0, Tue(2)→1, ...
  const firstDow = new Date(year, month - 1, 1).getDay()
  const leadingBlanks = (firstDow + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells: CalendarDay[] = []

  for (let i = 0; i < leadingBlanks; i++)
    cells.push({ date: null, day: 0, balance: null, isFuture: false, isToday: false, isCurrentMonth: false, card: null })

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const pt = balanceMap.get(dateStr)
    const dt = new Date(year, month - 1, day)
    cells.push({
      date: dateStr, day,
      balance: pt?.balance ?? null,
      isFuture: dt > today,
      isToday: dateStr === todayStr,
      isCurrentMonth: true,
      card: pt?.card ?? null,
    })
  }

  while (cells.length % 7 !== 0)
    cells.push({ date: null, day: 0, balance: null, isFuture: false, isToday: false, isCurrentMonth: false, card: null })

  return cells
})

// ─── Day Detail ───────────────────────────────────────────────────────────────

const showDayDetail   = ref(false)
const selectedDayDate = ref<string | null>(null)

const selectedDayTransactions = computed(() =>
  !selectedDayDate.value
    ? []
    : transactions.value
        .filter((t) => t.date === selectedDayDate.value)
        .sort((a, b) => b.createdAt - a.createdAt),
)

const selectedDayBalance = computed(() =>
  selectedDayDate.value
    ? (balanceTimeline.value.find((p) => p.date === selectedDayDate.value)?.balance ?? null)
    : null,
)

function openDayDetail(cell: CalendarDay) {
  if (!cell.isCurrentMonth || !cell.date) return
  selectedDayDate.value = cell.date
  expandedId.value = null
  confirmDeleteId.value = null
  showDayDetail.value = true
}

function openAddForDate(type: TransactionType) {
  isEditing.value = false
  editingTxId.value = null
  form.value = { ...defaultForm(), type, date: selectedDayDate.value ?? new Date().toISOString().slice(0, 10) }
  showDayDetail.value = false
  showDialog.value = true
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function fetchData() {
  isLoading.value = true
  try {
    const { data } = await HttpClient.get(ApiRoute.EXPENSE.INIT)
    currentBalance.value = Number(data.data.balance)
    balanceInput.value = Number(data.data.balance)
    transactions.value = data.data.transactions
    creditCards.value = data.data.cards
  } catch {
    ElMessage.error('Failed to load expense data')
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="page-container">

    <!-- Sticky header: month nav + view tabs -->
    <div class="sticky-header">
      <div class="month-nav">
        <el-button text @click="shiftMonth(-1)">‹</el-button>
        <span class="month-label">{{ monthLabel }}</span>
        <el-button text @click="shiftMonth(1)">›</el-button>
        <el-button text size="small" class="this-month-btn" @click="goToThisMonth">This Month</el-button>
      </div>
      <div class="view-toggle">
        <button class="view-tab" :class="{ 'view-tab--active': viewMode === 'transactions' }" @click="viewMode = 'transactions'">Transactions</button>
        <button class="view-tab" :class="{ 'view-tab--active': viewMode === 'charts' }" @click="viewMode = 'charts'">Charts</button>
      </div>
    </div>

    <!-- ── Projection Panel ── -->
    <div class="projection-panel">
      <div class="projection-header">
        <div class="projection-balance">
          <span class="projection-balance__icon">💰</span>
          <template v-if="editingBalance">
            <el-input-number
              v-model="balanceInput"
              :min="0" :precision="2" :step="0.01"
              style="width: 130px"
              autofocus
              @keyup.enter="saveBalance"
            />
            <el-button size="small" type="primary" @click="saveBalance">✓</el-button>
            <el-button size="small" text @click="editingBalance = false">✗</el-button>
          </template>
          <template v-else>
            <span class="projection-balance__amount" @click="startEditBalance">${{ formatAmount(currentBalance) }}</span>
            <span class="projection-balance__hint">tap to edit</span>
          </template>
        </div>
        <el-button size="small" text class="cards-btn" @click="showCardManager = true; cardManagerMode = 'list'">⚙ Cards</el-button>
      </div>

      <!-- No cards yet -->
      <div v-if="creditCards.length === 0" class="projection-empty">
        <span class="projection-empty__text">No credit cards added</span>
        <el-button size="small" @click="openAddCard">+ Add Card</el-button>
      </div>

      <!-- Card projection rows -->
      <div v-else>
        <div v-for="p in cardProjections" :key="p.card.id" class="projection-row">
          <span class="proj-dot" :style="{ background: p.card.color }" />
          <span class="proj-name">{{ p.card.name }}</span>
          <span class="proj-bill">${{ formatAmount(p.bill) }}</span>
          <span class="proj-due">due {{ formatDueDate(p.dueDate) }}</span>
          <span class="proj-arrow">→</span>
          <span class="proj-after" :class="p.projectedAfter >= 0 ? 'amount--earning' : 'amount--expense'">
            ${{ formatAmount(p.projectedAfter) }}
          </span>
        </div>
        <div class="projection-footer">
          <span class="projection-footer__label">Projected balance</span>
          <span class="projection-footer__amount" :class="projectedBalance >= 0 ? 'amount--earning' : 'amount--expense'">
            ${{ formatAmount(projectedBalance) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="summary-row">
      <div class="summary-card summary-card--balance">
        <div class="summary-card__label">Balance</div>
        <div class="summary-card__amount">${{ formatAmount(balance) }}</div>
        <div class="summary-card__sub">All time</div>
      </div>
      <div class="summary-card summary-card--in">
        <div class="summary-card__label">In</div>
        <div class="summary-card__amount">+${{ formatAmount(totalIn) }}</div>
        <div class="summary-card__sub">This month</div>
      </div>
      <div class="summary-card summary-card--out">
        <div class="summary-card__label">Out</div>
        <div class="summary-card__amount">-${{ formatAmount(totalOut) }}</div>
        <div class="summary-card__sub">This month</div>
      </div>
    </div>

    <!-- ── Transactions view ── -->
    <template v-if="viewMode === 'transactions'">
      <div class="controls-row">
        <div class="filter-pills">
          <button class="filter-pill" :class="{ 'filter-pill--active': filter === 'all' }" @click="filter = 'all'">All</button>
          <button class="filter-pill filter-pill--expense" :class="{ 'filter-pill--active': filter === 'expense' }" @click="filter = 'expense'">Expenses</button>
          <button class="filter-pill filter-pill--earning" :class="{ 'filter-pill--active': filter === 'earning' }" @click="filter = 'earning'">Earnings</button>
        </div>
        <div class="add-buttons">
          <el-button size="small" @click="openAdd('expense')">+ Expense</el-button>
          <el-button size="small" type="success" @click="openAdd('earning')">+ Earning</el-button>
        </div>
      </div>

      <div v-if="filteredTransactions.length === 0" class="empty-state">
        <div class="empty-state__icon">💸</div>
        <div class="empty-state__text">No transactions this month</div>
      </div>

      <div v-else class="transaction-list">
        <div v-for="group in groupedTransactions" :key="group.date" class="date-group">
          <div class="date-header">
            <span class="date-header__label">{{ formatDateLabel(group.date) }}</span>
            <span class="date-header__totals">
              <span v-if="dayTotals[group.date]?.expense" class="day-total day-total--expense">−${{ formatAmount(dayTotals[group.date].expense) }}</span>
              <span v-if="dayTotals[group.date]?.earning" class="day-total day-total--earning">+${{ formatAmount(dayTotals[group.date].earning) }}</span>
            </span>
          </div>

          <div v-for="t in group.items" :key="t.id" class="transaction-item">
            <Transition name="expand">
              <div v-if="confirmDeleteId === t.id" class="confirm-row">
                <span class="confirm-text">Delete "{{ t.description }}"?</span>
                <el-button size="small" text @click="cancelDelete">Cancel</el-button>
                <el-button size="small" type="danger" @click="confirmDelete(t.id)">Delete</el-button>
              </div>
            </Transition>

            <Transition name="expand">
              <div v-if="confirmDeleteId !== t.id" class="transaction-row" @click="toggleExpand(t.id)">
                <span class="category-icon">{{ getCategoryIcon(t.type, t.category) }}</span>
                <div class="transaction-info">
                  <span class="transaction-desc">{{ t.description }}</span>
                  <div class="transaction-meta">
                    <span class="category-tag">{{ getCategoryLabel(t.type, t.category) }}</span>
                    <span v-if="t.cardId" class="card-badge" :style="{ borderColor: getCardColor(t.cardId), color: getCardColor(t.cardId) }">
                      <span class="card-badge__dot" :style="{ background: getCardColor(t.cardId) }" />{{ getCardName(t.cardId) }}
                    </span>
                  </div>
                </div>
                <div class="transaction-right">
                  <span class="transaction-amount" :class="t.type === 'expense' ? 'amount--expense' : 'amount--earning'">
                    {{ t.type === 'expense' ? '−' : '+' }}${{ formatAmount(t.amount) }}
                  </span>
                  <span class="expand-hint">{{ expandedId === t.id ? '▲' : '▼' }}</span>
                </div>
              </div>
            </Transition>

            <Transition name="expand">
              <div v-if="expandedId === t.id && confirmDeleteId !== t.id" class="expand-panel">
                <span v-if="t.notes" class="expand-notes">{{ t.notes }}</span>
                <span v-else class="expand-notes expand-notes--empty">No notes</span>
                <div class="expand-actions">
                  <el-button size="small" @click.stop="openEdit(t)">Edit</el-button>
                  <el-button size="small" type="danger" plain @click.stop="openDelete(t.id)">Delete</el-button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Charts view ── -->
    <template v-else>
      <div class="charts-toolbar">
        <el-button size="small" @click="openAdd('expense')">+ Expense</el-button>
        <el-button size="small" type="success" @click="openAdd('earning')">+ Earning</el-button>
      </div>

      <!-- Balance Calendar -->
      <div class="chart-card">
        <div class="chart-card__title">Balance Calendar</div>
        <div class="cal-grid">
          <!-- Day-of-week headers -->
          <div v-for="h in ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']" :key="h" class="cal-header">{{ h }}</div>
          <!-- Day cells -->
          <div
            v-for="(cell, i) in calendarDays"
            :key="i"
            class="cal-cell"
            :class="{
              'cal-cell--empty':     !cell.isCurrentMonth,
              'cal-cell--today':      cell.isToday,
              'cal-cell--future':     cell.isFuture && !cell.isToday,
              'cal-cell--clickable':  cell.isCurrentMonth,
            }"
            @click="openDayDetail(cell)"
          >
            <template v-if="cell.isCurrentMonth">
              <span class="cal-day">{{ cell.day }}</span>
              <span
                v-if="cell.balance !== null"
                class="cal-balance"
                :class="cell.balance >= 0 ? 'cal-balance--pos' : 'cal-balance--neg'"
                :style="cell.card ? { color: cell.card.color } : {}"
              >
                {{ Math.abs(cell.balance) >= 1000
                  ? `$${(cell.balance / 1000).toFixed(1)}k`
                  : `$${cell.balance.toFixed(0)}` }}
              </span>
              <span v-else class="cal-balance cal-balance--na">—</span>
              <span v-if="cell.card" class="cal-cc-dot" :style="{ background: cell.card.color }" />
            </template>
          </div>
        </div>
      </div>

      <div v-if="totalIn > 0 || totalOut > 0" class="savings-card">
        <div class="savings-card__row">
          <div>
            <div class="savings-card__label">Net this month</div>
            <div class="savings-card__amount" :class="netThisMonth >= 0 ? 'amount--earning' : 'amount--expense'">
              {{ netThisMonth >= 0 ? '+' : '−' }}${{ formatAmount(Math.abs(netThisMonth)) }}
            </div>
          </div>
          <div v-if="savingsRate !== null" class="savings-card__rate">
            <div class="savings-card__label">Savings rate</div>
            <div class="savings-card__pct" :class="savingsRate >= 0 ? 'amount--earning' : 'amount--expense'">{{ savingsRate }}%</div>
          </div>
        </div>
        <div v-if="savingsRate !== null" class="savings-bar">
          <div class="savings-bar__fill" :class="savingsRate >= 0 ? 'savings-bar__fill--positive' : 'savings-bar__fill--negative'" :style="{ width: `${Math.min(Math.abs(savingsRate), 100)}%` }" />
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-card__title">Expenses by Category</div>
        <div v-if="!categoryBreakdown.length" class="empty-state empty-state--sm">
          <div class="empty-state__icon">🍩</div><div class="empty-state__text">No expenses this month</div>
        </div>
        <div v-else class="donut-layout">
          <svg viewBox="0 0 200 200" class="donut-svg">
            <template v-if="donutArcs.length === 1">
              <circle cx="100" cy="100" r="78" :fill="donutArcs[0].color" />
              <circle cx="100" cy="100" r="50" fill="var(--color-background-soft)" />
            </template>
            <template v-else>
              <path v-for="arc in donutArcs" :key="arc.category" :d="arc.path" :fill="arc.color" stroke="var(--color-background-soft)" stroke-width="2" />
            </template>
            <text x="100" y="96" text-anchor="middle" class="donut-center-label">Total</text>
            <text x="100" y="112" text-anchor="middle" class="donut-center-amount">${{ formatAmount(totalOut) }}</text>
          </svg>
          <div class="donut-legend">
            <div v-for="cat in categoryBreakdown" :key="cat.category" class="legend-row">
              <span class="legend-dot" :style="{ background: cat.color }" />
              <span class="legend-icon">{{ cat.icon }}</span>
              <span class="legend-label">{{ cat.label }}</span>
              <span class="legend-pct">{{ cat.pct }}%</span>
              <span class="legend-amount">${{ formatAmount(cat.amount) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-card__title">Daily Activity</div>
        <div class="bar-chart-legend">
          <span class="bar-legend-dot bar-legend-dot--expense" />Expenses
          <span class="bar-legend-dot bar-legend-dot--earning" style="margin-left:12px" />Earnings
        </div>
        <div v-if="!monthTransactions.length" class="empty-state empty-state--sm">
          <div class="empty-state__icon">📊</div><div class="empty-state__text">No data this month</div>
        </div>
        <div v-else class="bar-chart-wrap">
          <svg :viewBox="`0 0 ${BAR.vw} ${BAR.vh}`" preserveAspectRatio="xMidYMid meet" class="bar-chart-svg">
            <template v-for="(val, i) in bGrid" :key="i">
              <line :x1="BAR.pl" :y1="BAR.pt + bH * (1 - val / (bGrid[2] || 1))" :x2="BAR.vw - BAR.pr" :y2="BAR.pt + bH * (1 - val / (bGrid[2] || 1))" class="bar-grid-line" />
              <text :x="BAR.pl - 4" :y="BAR.pt + bH * (1 - val / (bGrid[2] || 1)) + 4" text-anchor="end" class="bar-axis-label">{{ val > 0 ? (val >= 1000 ? `${(val/1000).toFixed(1)}k` : val) : '' }}</text>
            </template>
            <template v-for="s in barSlots" :key="s.day">
              <rect v-if="s.expBar" :x="s.expBar.x" :y="s.expBar.y" :width="s.expBar.w" :height="s.expBar.h" rx="2" class="bar-expense" />
              <rect v-if="s.ernBar" :x="s.ernBar.x" :y="s.ernBar.y" :width="s.ernBar.w" :height="s.ernBar.h" rx="2" class="bar-earning" />
              <text v-if="s.label" :x="s.lx" :y="s.ly" text-anchor="middle" class="bar-day-label">{{ s.day }}</text>
            </template>
            <line :x1="BAR.pl" :y1="BAR.pt + bH" :x2="BAR.vw - BAR.pr" :y2="BAR.pt + bH" class="bar-axis-line" />
          </svg>
        </div>
      </div>
    </template>

    <!-- ── Add/Edit Transaction Dialog ── -->
    <el-dialog
      v-model="showDialog"
      :title="isEditing ? 'Edit Transaction' : (form.type === 'expense' ? 'Add Expense' : 'Add Earning')"
      width="360px"
      :close-on-click-modal="false"
    >
      <el-form label-position="top">
        <el-form-item label="Amount (SGD)">
          <el-input-number v-model="form.amount" :min="0.01" :precision="2" :step="0.01" placeholder="0.00" style="width:100%" autofocus />
        </el-form-item>

        <el-form-item label="Description">
          <el-input v-model="form.description" placeholder="What was this for?" maxlength="80" />
        </el-form-item>

        <!-- Paid with (expense only) -->
        <el-form-item v-if="form.type === 'expense'" label="Paid with">
          <div class="payment-pills">
            <button class="payment-pill" :class="{ 'payment-pill--active': form.cardId === null }" @click="form.cardId = null">
              💳 Cash / Debit
            </button>
            <button
              v-for="card in creditCards"
              :key="card.id"
              class="payment-pill"
              :class="{ 'payment-pill--active': form.cardId === card.id }"
              :style="form.cardId === card.id ? { borderColor: card.color, color: card.color, background: card.color + '18' } : {}"
              @click="form.cardId = card.id"
            >
              <span class="payment-pill__dot" :style="{ background: card.color }" />{{ card.name }}
            </button>
          </div>
        </el-form-item>

        <el-form-item label="Category">
          <div class="category-grid">
            <button
              v-for="cat in currentCategories"
              :key="cat.value"
              class="category-pill"
              :class="{ 'category-pill--selected': form.category === cat.value }"
              :style="form.category === cat.value ? { borderColor: CATEGORY_COLORS[cat.value] ?? '#94a3b8', color: CATEGORY_COLORS[cat.value] ?? '#94a3b8' } : {}"
              @click="form.category = cat.value"
            >
              <span class="category-pill__icon">{{ cat.icon }}</span>
              <span class="category-pill__label">{{ cat.label }}</span>
            </button>
          </div>
        </el-form-item>

        <el-form-item label="Date">
          <el-date-picker v-model="form.date" type="date" placeholder="Pick a date" format="DD MMM YYYY" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>

        <el-form-item label="Notes (optional)">
          <el-input v-model="form.notes" type="textarea" :rows="2" placeholder="Any extra details..." maxlength="200" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showDialog = false">Cancel</el-button>
        <el-button type="primary" :disabled="!canSubmit" @click="submitForm">{{ isEditing ? 'Save' : 'Add' }}</el-button>
      </template>
    </el-dialog>

    <!-- ── Manage Cards Dialog ── -->
    <el-dialog
      v-model="showCardManager"
      title="Credit Cards"
      width="360px"
      :close-on-click-modal="false"
      @close="cardManagerMode = 'list'; editingCard = null"
    >
      <!-- List mode -->
      <div v-if="cardManagerMode === 'list'">
        <div v-if="!creditCards.length" class="cards-empty">
          <p>No cards added yet.</p>
        </div>
        <div v-else class="cards-list">
          <div v-for="card in creditCards" :key="card.id" class="card-row">
            <span class="card-row__dot" :style="{ background: card.color }" />
            <div class="card-row__info">
              <span class="card-row__name">{{ card.name }}</span>
              <span class="card-row__sub">Cycle ends {{ card.cycleEndDay }}th · Due {{ card.dueDay }}th of next month</span>
            </div>
            <el-button size="small" text @click="openEditCard(card)">Edit</el-button>
            <el-button size="small" text type="danger" @click="deleteCard(card.id)">Del</el-button>
          </div>
        </div>
      </div>

      <!-- Form mode -->
      <div v-else>
        <el-form label-position="top">
          <el-form-item label="Card Name">
            <el-input v-model="cardForm.name" placeholder="e.g. DBS Altitude" maxlength="40" autofocus />
          </el-form-item>
          <el-form-item label="Billing Cycle Ends On (day of month)">
            <el-input-number v-model="cardForm.cycleEndDay" :min="1" :max="28" :step="1" :precision="0" style="width:100%" />
          </el-form-item>
          <el-form-item label="Payment Due On (day of following month)">
            <el-input-number v-model="cardForm.dueDay" :min="1" :max="28" :step="1" :precision="0" style="width:100%" />
          </el-form-item>
          <el-form-item label="Color">
            <div class="color-picker">
              <button
                v-for="color in CARD_COLOR_PRESETS"
                :key="color"
                class="color-swatch"
                :class="{ 'color-swatch--active': cardForm.color === color }"
                :style="{ background: color }"
                @click="cardForm.color = color"
              />
            </div>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <template v-if="cardManagerMode === 'list'">
          <el-button type="primary" @click="openAddCard">+ Add Card</el-button>
        </template>
        <template v-else>
          <el-button @click="cardManagerMode = 'list'; editingCard = null">Back</el-button>
          <el-button type="primary" :disabled="!canSaveCard" @click="saveCard">{{ editingCard ? 'Save' : 'Add Card' }}</el-button>
        </template>
      </template>
    </el-dialog>

    <!-- ── Day Detail Dialog ── -->
    <el-dialog
      v-model="showDayDetail"
      :title="selectedDayDate ? new Date(selectedDayDate + 'T00:00:00').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' }) : ''"
      width="360px"
      @close="expandedId = null; confirmDeleteId = null"
    >
      <!-- Balance line -->
      <div v-if="selectedDayBalance !== null" class="day-detail-balance">
        <span>Balance</span>
        <span :class="selectedDayBalance >= 0 ? 'amount--earning' : 'amount--expense'">
          ${{ formatAmount(selectedDayBalance) }}
        </span>
      </div>

      <!-- Transactions list -->
      <div v-if="selectedDayTransactions.length" class="day-detail-list">
        <div v-for="t in selectedDayTransactions" :key="t.id" class="transaction-item">
          <Transition name="expand">
            <div v-if="confirmDeleteId === t.id" class="confirm-row">
              <span class="confirm-text">Delete "{{ t.description }}"?</span>
              <el-button size="small" text @click="cancelDelete">Cancel</el-button>
              <el-button size="small" type="danger" @click="confirmDelete(t.id)">Delete</el-button>
            </div>
          </Transition>
          <Transition name="expand">
            <div v-if="confirmDeleteId !== t.id" class="transaction-row" @click="toggleExpand(t.id)">
              <span class="category-icon">{{ getCategoryIcon(t.type, t.category) }}</span>
              <div class="transaction-info">
                <span class="transaction-desc">{{ t.description }}</span>
                <div class="transaction-meta">
                  <span class="category-tag">{{ getCategoryLabel(t.type, t.category) }}</span>
                  <span v-if="t.cardId" class="card-badge" :style="{ borderColor: getCardColor(t.cardId), color: getCardColor(t.cardId) }">
                    <span class="card-badge__dot" :style="{ background: getCardColor(t.cardId) }" />{{ getCardName(t.cardId) }}
                  </span>
                </div>
              </div>
              <div class="transaction-right">
                <span class="transaction-amount" :class="t.type === 'expense' ? 'amount--expense' : 'amount--earning'">
                  {{ t.type === 'expense' ? '−' : '+' }}${{ formatAmount(t.amount) }}
                </span>
                <span class="expand-hint">{{ expandedId === t.id ? '▲' : '▼' }}</span>
              </div>
            </div>
          </Transition>
          <Transition name="expand">
            <div v-if="expandedId === t.id && confirmDeleteId !== t.id" class="expand-panel">
              <span v-if="t.notes" class="expand-notes">{{ t.notes }}</span>
              <span v-else class="expand-notes expand-notes--empty">No notes</span>
              <div class="expand-actions">
                <el-button size="small" @click.stop="openEdit(t); showDayDetail = false">Edit</el-button>
                <el-button size="small" type="danger" plain @click.stop="openDelete(t.id)">Delete</el-button>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state empty-state--sm">
        <div class="empty-state__icon">📭</div>
        <div class="empty-state__text">No transactions this day</div>
      </div>

      <template #footer>
        <el-button @click="openAddForDate('expense')">+ Expense</el-button>
        <el-button type="success" @click="openAddForDate('earning')">+ Earning</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<style scoped>
.page-container { max-width: 640px; width: 100%; margin: 0 auto; padding-bottom: 2rem; }

/* Sticky header */
.sticky-header { position: sticky; top: 0; z-index: 10; background: var(--color-background); backdrop-filter: blur(8px); padding-top: 12px; margin-bottom: 4px; }

.month-nav { display: flex; align-items: center; justify-content: center; gap: 4px; padding-bottom: 8px; }
.month-label { font-size: 1.1rem; font-weight: 700; color: var(--color-heading); min-width: 90px; text-align: center; }
.this-month-btn { font-size: 0.75rem; color: var(--color-text); opacity: 0.55; margin-left: 4px; }

.view-toggle { display: flex; border: 1px solid var(--color-border); border-radius: 10px; overflow: hidden; margin-bottom: 12px; }
.view-tab { flex: 1; padding: 7px; border: none; background: transparent; font-size: 0.875rem; color: var(--color-text); cursor: pointer; transition: all 0.15s; }
.view-tab--active { background: var(--color-background-mute); font-weight: 600; color: var(--color-heading); }

/* Projection panel */
.projection-panel { border: 1px solid var(--color-border); border-radius: 12px; padding: 14px 16px; background: var(--color-background-soft); margin-bottom: 12px; }

.projection-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }

.projection-balance { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.projection-balance__icon { font-size: 1.1rem; }
.projection-balance__amount { font-size: 1.3rem; font-weight: 800; color: var(--color-heading); cursor: pointer; border-bottom: 1px dashed var(--color-border); }
.projection-balance__amount:hover { border-color: var(--el-color-primary); color: var(--el-color-primary); }
.projection-balance__hint { font-size: 0.7rem; color: var(--color-text); opacity: 0.4; }

.cards-btn { font-size: 0.8rem; }

.projection-empty { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.projection-empty__text { font-size: 0.85rem; color: var(--color-text); opacity: 0.5; }

.projection-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 0.83rem; border-top: 1px solid var(--color-border); }
.proj-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.proj-name { flex: 1; color: var(--color-text); font-weight: 500; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.proj-bill { font-weight: 700; color: var(--el-color-danger); flex-shrink: 0; }
.proj-due { font-size: 0.75rem; color: var(--color-text); opacity: 0.5; flex-shrink: 0; }
.proj-arrow { opacity: 0.3; flex-shrink: 0; }
.proj-after { font-weight: 700; flex-shrink: 0; }

.projection-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--color-border); }
.projection-footer__label { font-size: 0.8rem; font-weight: 600; color: var(--color-text); opacity: 0.6; }
.projection-footer__amount { font-size: 1rem; font-weight: 800; }

/* Summary cards */
.summary-row { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.summary-card { border: 1px solid var(--color-border); border-radius: 12px; padding: 12px; background: var(--color-background-soft); }
.summary-card__label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text); opacity: 0.6; }
.summary-card__amount { font-size: 1.05rem; font-weight: 800; margin-top: 3px; color: var(--color-heading); }
.summary-card__sub { font-size: 0.68rem; color: var(--color-text); opacity: 0.45; margin-top: 2px; }
.summary-card--in .summary-card__amount { color: #22c55e; }
.summary-card--out .summary-card__amount { color: var(--el-color-danger); }

/* Controls */
.controls-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.filter-pills { display: flex; gap: 6px; }
.filter-pill { padding: 5px 10px; border: 1px solid var(--color-border); border-radius: 20px; background: transparent; font-size: 0.78rem; color: var(--color-text); cursor: pointer; transition: all 0.15s; }
.filter-pill:hover { border-color: var(--el-color-primary); color: var(--el-color-primary); }
.filter-pill--active { background: var(--color-background-mute); color: var(--color-heading); font-weight: 600; }
.filter-pill--expense.filter-pill--active { border-color: var(--el-color-danger); color: var(--el-color-danger); }
.filter-pill--earning.filter-pill--active { border-color: #22c55e; color: #22c55e; }
.add-buttons { display: flex; gap: 6px; }

/* Empty */
.empty-state { text-align: center; padding: 48px 0; color: var(--color-text); opacity: 0.45; }
.empty-state--sm { padding: 28px 0; }
.empty-state__icon { font-size: 2.5rem; margin-bottom: 10px; }
.empty-state__text { font-size: 0.9rem; }

/* Date groups */
.date-group { margin-bottom: 4px; }
.date-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 4px 4px; }
.date-header__label { font-size: 0.75rem; font-weight: 600; color: var(--color-text); opacity: 0.5; text-transform: uppercase; letter-spacing: 0.5px; }
.date-header__totals { display: flex; gap: 8px; }
.day-total { font-size: 0.75rem; font-weight: 600; }
.day-total--expense { color: var(--el-color-danger); opacity: 0.8; }
.day-total--earning { color: #22c55e; opacity: 0.8; }

/* Transaction items */
.transaction-item { border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-background-soft); margin-bottom: 6px; overflow: hidden; cursor: pointer; transition: border-color 0.15s; }
.transaction-item:hover { border-color: var(--color-border-hover); }
.transaction-row { display: flex; align-items: center; gap: 10px; padding: 12px 14px; user-select: none; }
.category-icon { font-size: 1.3rem; flex-shrink: 0; width: 28px; text-align: center; }
.transaction-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.transaction-desc { font-size: 0.9rem; font-weight: 600; color: var(--color-heading); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.transaction-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.category-tag { font-size: 0.72rem; color: var(--color-text); opacity: 0.55; }

/* Card badge */
.card-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 0.7rem; font-weight: 600; border: 1px solid; border-radius: 4px; padding: 1px 5px; }
.card-badge__dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

.transaction-right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.transaction-amount { font-size: 0.95rem; font-weight: 700; }
.amount--expense { color: var(--el-color-danger); }
.amount--earning { color: #22c55e; }
.expand-hint { font-size: 0.6rem; color: var(--color-text); opacity: 0.3; }

.expand-panel { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 14px 12px; border-top: 1px solid var(--color-border); background: var(--color-background-mute); }
.expand-notes { font-size: 0.8rem; color: var(--color-text); opacity: 0.65; font-style: italic; flex: 1; }
.expand-notes--empty { opacity: 0.35; }
.expand-actions { display: flex; gap: 6px; flex-shrink: 0; }

/* Confirm row */
.confirm-row { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: color-mix(in srgb, var(--el-color-danger) 8%, transparent); }
.confirm-text { flex: 1; font-size: 0.85rem; color: var(--el-color-danger); }

/* Charts toolbar */
.charts-toolbar { display: flex; justify-content: flex-end; gap: 6px; margin-bottom: 12px; }

/* Savings card */
.savings-card { border: 1px solid var(--color-border); border-radius: 12px; padding: 14px 16px; background: var(--color-background-soft); margin-bottom: 14px; }
.savings-card__row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.savings-card__label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text); opacity: 0.6; }
.savings-card__amount { font-size: 1.3rem; font-weight: 800; margin-top: 3px; }
.savings-card__rate { text-align: right; }
.savings-card__pct { font-size: 1.3rem; font-weight: 800; margin-top: 3px; }
.savings-bar { height: 6px; background: var(--color-background-mute); border-radius: 3px; overflow: hidden; }
.savings-bar__fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
.savings-bar__fill--positive { background: #22c55e; }
.savings-bar__fill--negative { background: var(--el-color-danger); }

/* Chart cards */
.chart-card { border: 1px solid var(--color-border); border-radius: 12px; padding: 18px 16px; background: var(--color-background-soft); margin-bottom: 16px; }
.chart-card__title { font-size: 0.85rem; font-weight: 700; color: var(--color-heading); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; opacity: 0.7; }
.donut-layout { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.donut-svg { width: 160px; height: 160px; flex-shrink: 0; }
.donut-center-label { font-size: 10px; fill: var(--color-text); opacity: 0.5; }
.donut-center-amount { font-size: 13px; font-weight: 700; fill: var(--color-heading); }
.donut-legend { flex: 1; min-width: 180px; display: flex; flex-direction: column; gap: 8px; }
.legend-row { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.legend-icon { font-size: 1rem; flex-shrink: 0; }
.legend-label { flex: 1; color: var(--color-text); }
.legend-pct { font-weight: 600; color: var(--color-heading); min-width: 32px; text-align: right; }
.legend-amount { color: var(--color-text); opacity: 0.65; min-width: 64px; text-align: right; }
.bar-chart-legend { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--color-text); margin-bottom: 12px; opacity: 0.65; }
.bar-legend-dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.bar-legend-dot--expense { background: var(--el-color-danger); opacity: 0.75; }
.bar-legend-dot--earning { background: #22c55e; opacity: 0.75; }
.bar-chart-wrap { width: 100%; }
.bar-chart-svg { width: 100%; height: auto; display: block; }
.bar-grid-line { stroke: var(--color-border); stroke-width: 1; stroke-dasharray: 3 3; }
.bar-axis-line { stroke: var(--color-border); stroke-width: 1; }
.bar-axis-label { font-size: 9px; fill: var(--color-text); opacity: 0.45; }
.bar-day-label { font-size: 9px; fill: var(--color-text); opacity: 0.45; }
.bar-expense { fill: var(--el-color-danger); opacity: 0.75; }
.bar-earning { fill: #22c55e; opacity: 0.75; }

/* Payment pills */
.payment-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.payment-pill { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border: 1px solid var(--color-border); border-radius: 20px; background: transparent; font-size: 0.82rem; color: var(--color-text); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.payment-pill:hover { border-color: var(--el-color-primary); }
.payment-pill--active { background: var(--color-background-mute); font-weight: 600; color: var(--color-heading); border-color: var(--color-border); }
.payment-pill__dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* Category grid */
.category-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; width: 100%; }
.category-pill { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border: 1px solid var(--color-border); border-radius: 8px; background: transparent; cursor: pointer; transition: all 0.15s; text-align: left; }
.category-pill:hover { background: var(--color-background-mute); }
.category-pill--selected { background: var(--color-background-mute); border-width: 1.5px; }
.category-pill__icon { font-size: 1rem; flex-shrink: 0; }
.category-pill__label { font-size: 0.8rem; color: var(--color-text); }

/* Cards manager */
.cards-empty { padding: 8px 0 12px; color: var(--color-text); opacity: 0.5; font-size: 0.9rem; }
.cards-list { display: flex; flex-direction: column; gap: 8px; }
.card-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
.card-row:last-child { border-bottom: none; }
.card-row__dot { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
.card-row__info { flex: 1; min-width: 0; }
.card-row__name { font-size: 0.9rem; font-weight: 600; color: var(--color-heading); display: block; }
.card-row__sub { font-size: 0.72rem; color: var(--color-text); opacity: 0.55; }

/* Color picker */
.color-picker { display: flex; gap: 8px; flex-wrap: wrap; }
.color-swatch { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 0.1s; }
.color-swatch:hover { transform: scale(1.15); }
.color-swatch--active { border-color: var(--color-heading); transform: scale(1.15); }

/* Expand transition */
.expand-enter-active, .expand-leave-active { transition: max-height 0.2s ease, opacity 0.15s ease; overflow: hidden; }
.expand-enter-from, .expand-leave-to { max-height: 0; opacity: 0; }
.expand-enter-to, .expand-leave-from { max-height: 200px; opacity: 1; }

/* Day detail dialog */
.day-detail-balance { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; font-weight: 600; padding: 0 0 12px; margin-bottom: 12px; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
.day-detail-list { display: flex; flex-direction: column; gap: 0; }

/* Balance Calendar */
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
.cal-header { text-align: center; font-size: 0.62rem; font-weight: 600; color: var(--color-text); opacity: 0.45; padding: 4px 0 6px; text-transform: uppercase; letter-spacing: 0.3px; }
.cal-cell { border: 1px solid var(--color-border); border-radius: 6px; padding: 5px 4px 6px; min-height: 52px; display: flex; flex-direction: column; align-items: center; gap: 3px; position: relative; }
.cal-cell--empty { border: none; background: none; min-height: 0; }
.cal-cell--clickable { cursor: pointer; }
.cal-cell--clickable:hover { border-color: var(--color-border-hover); background: var(--color-background-mute); }
.cal-cell--today { border-color: #22c55e; background: color-mix(in srgb, #22c55e 8%, transparent); }
.cal-cell--today.cal-cell--clickable:hover { border-color: #22c55e; background: color-mix(in srgb, #22c55e 14%, transparent); }
.cal-cell--future { opacity: 0.6; }
.cal-day { font-size: 0.68rem; font-weight: 700; color: var(--color-heading); align-self: flex-start; line-height: 1; }
.cal-cell--today .cal-day { color: #22c55e; }
.cal-balance { font-size: 0.62rem; font-weight: 600; line-height: 1; text-align: center; margin-top: 2px; }
.cal-balance--pos { color: var(--color-text); opacity: 0.8; }
.cal-balance--neg { color: var(--el-color-danger); }
.cal-balance--na { opacity: 0.25; }
.cal-cc-dot { width: 5px; height: 5px; border-radius: 50%; position: absolute; bottom: 4px; right: 4px; flex-shrink: 0; }
</style>
