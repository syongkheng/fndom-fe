<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useNav } from '@/hooks/useNav'
import { useApplePayStore } from '@/stores/applepay'
import { useSsApiKeyStore } from '@/stores/ssApiKey'
import { useAuthenticationStore } from '@/stores/authentication'
import SignInPrompt from './SignInPrompt.vue'

const { t } = useI18n()
const nav = useNav()
const store = useApplePayStore()
const ssKeyStore = useSsApiKeyStore()
const { transactions, isLoading } = storeToRefs(store)
const { isAuthenticated } = storeToRefs(useAuthenticationStore())

// null = unknown (still loading or request failed) — only a confirmed
// "no key" switches the empty state to the setup call-to-action.
const hasKey = ref<boolean | null>(null)

const load = async () => {
  if (!isAuthenticated.value) return
  store.fetchTransactions()
  hasKey.value = await ssKeyStore
    .fetchApiKeyStatus()
    .then((s) => s.hasKey)
    .catch(() => null)
}
onMounted(load)
watch(isAuthenticated, load)

// Already sorted newest-first server-side (ORDER BY occurred_dt DESC).
const recent = computed(() => transactions.value.slice(0, 4))

const monthTransactions = computed(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  return transactions.value.filter((tx) => tx.occurredDt >= start)
})

// Headline total is SGD only (amounts are never converted); other currencies
// are listed underneath as their own totals.
const HOME_CURRENCY = 'SGD'
const txCurrency = (tx: { currency?: string }) => tx.currency || HOME_CURRENCY

const monthTotal = computed(() =>
  monthTransactions.value.filter((tx) => txCurrency(tx) === HOME_CURRENCY).reduce((sum, tx) => sum + tx.amount, 0),
)

const monthForeignTotals = computed(() => {
  const totals = new Map<string, number>()
  for (const tx of monthTransactions.value) {
    const currency = txCurrency(tx)
    if (currency !== HOME_CURRENCY) totals.set(currency, (totals.get(currency) ?? 0) + tx.amount)
  }
  return Array.from(totals, ([currency, amount]) => ({ currency, amount })).sort((a, b) => b.amount - a.amount)
})

const monthLabel = computed(() => new Date().toLocaleString(undefined, { month: 'long' }))

const isEmpty = computed(() => !isLoading.value && transactions.value.length === 0)

const formatAmount = (n: number, currency: string = HOME_CURRENCY) =>
  n.toLocaleString(undefined, { style: 'currency', currency })

// Split so the currency code can be rendered smaller than the digits,
// keeping locale-correct ordering (prefix or suffix).
const monthTotalParts = computed(() =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: HOME_CURRENCY })
    .formatToParts(monthTotal.value)
    .map((p) => ({ value: p.value, isCurrency: p.type === 'currency' })),
)

const formatDate = (ts: number) =>
  new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const openTracker = () => nav.redirectTo('/apple-pay')
</script>

<template>
  <section class="expense-hero" v-loading="isAuthenticated && isLoading">
    <div class="expense-hero-head">
      <div>
        <p class="expense-hero-eyebrow">{{ t('dashboard.expenseTracker.eyebrow') }}</p>
        <h2 class="expense-hero-title">{{ t('dashboard.expenseTracker.title') }}</h2>
      </div>
      <el-button v-if="isAuthenticated && !isEmpty" type="primary" @click="openTracker">
        {{ t('dashboard.expenseTracker.viewAll') }}
      </el-button>
    </div>

    <SignInPrompt v-if="!isAuthenticated" :message="t('dashboard.expenseTracker.signIn')" />

    <!-- Empty: guide the user into the Shortcut setup -->
    <div v-else-if="isEmpty" class="expense-hero-empty">
      <template v-if="hasKey === false">
        <p class="expense-hero-empty-title">{{ t('dashboard.expenseTracker.setupTitle') }}</p>
        <p class="expense-hero-empty-desc">{{ t('dashboard.expenseTracker.setupDesc') }}</p>
        <el-button type="primary" @click="openTracker">
          {{ t('dashboard.expenseTracker.setupAction') }}
        </el-button>
      </template>
      <template v-else>
        <p class="expense-hero-empty-title">{{ t('dashboard.expenseTracker.waitingTitle') }}</p>
        <p class="expense-hero-empty-desc">{{ t('dashboard.expenseTracker.waitingDesc') }}</p>
        <el-button @click="openTracker">
          {{ t('dashboard.expenseTracker.waitingAction') }}
        </el-button>
      </template>
    </div>

    <div v-else class="expense-hero-body">
      <div class="expense-hero-stat">
        <span class="expense-hero-stat-label">{{ t('dashboard.expenseTracker.spentIn', { month: monthLabel }) }}</span>
        <span class="expense-hero-stat-value"
          ><span
            v-for="(part, i) in monthTotalParts"
            :key="i"
            :class="{ 'expense-hero-stat-currency': part.isCurrency }"
            >{{ part.value }}</span
          ></span
        >
        <span v-for="c in monthForeignTotals" :key="c.currency" class="expense-hero-stat-sub">
          + {{ formatAmount(c.amount, c.currency) }}
        </span>
        <span class="expense-hero-stat-sub">{{ t('dashboard.expenseTracker.paymentCount', monthTransactions.length) }}</span>
      </div>

      <div class="expense-hero-recent">
        <p class="expense-hero-recent-title">{{ t('dashboard.expenseTracker.recent') }}</p>
        <ul class="expense-hero-list">
          <li v-for="tx in recent" :key="tx.id" class="expense-hero-row">
            <div class="expense-hero-row-main">
              <span class="expense-hero-merchant">{{ tx.merchant }}</span>
              <span class="expense-hero-date">{{ formatDate(tx.occurredDt) }}</span>
            </div>
            <span class="expense-hero-amount">{{ formatAmount(tx.amount, txCurrency(tx)) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.expense-hero {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 20px 22px;
  border-radius: var(--radius);
  background: var(--color-background-soft);
  border: 1px solid var(--el-color-primary-light-7);
  box-shadow: 0 1px 0 var(--el-color-primary-light-9) inset;
  /* The card is user-resizable, so layout responds to its own width. */
  container-type: inline-size;
}

.expense-hero-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.expense-hero-eyebrow {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--el-color-primary);
  margin: 0 0 4px;
}

.expense-hero-title {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--color-heading);
  margin: 0;
}

/* ── Filled state ─────────────────────────────────────── */
.expense-hero-body {
  display: grid;
  /* Stat column sizes to its content so the total never spills into the
     list; the list takes the rest and truncates merchant names instead. */
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 36px;
  align-items: start;
}

.expense-hero-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.expense-hero-stat-label {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.6;
}

.expense-hero-stat-value {
  font-size: 1.9rem;
  font-weight: 800;
  color: var(--color-heading);
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.expense-hero-stat-currency {
  font-size: 0.55em;
  font-weight: 700;
  opacity: 0.7;
  letter-spacing: 0.02em;
}

.expense-hero-stat-sub {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.55;
}

.expense-hero-recent-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
  margin: 0 0 8px;
}

.expense-hero-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.expense-hero-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.expense-hero-row-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.expense-hero-merchant {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expense-hero-date {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.55;
}

.expense-hero-amount {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-heading);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* ── Empty state ──────────────────────────────────────── */
.expense-hero-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.expense-hero-empty-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
}

.expense-hero-empty-desc {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
  margin: 0 0 8px;
  max-width: 52ch;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .expense-hero {
    padding: 16px;
  }
}

/* Narrow card: stack the total above the list instead of squeezing. */
@container (max-width: 560px) {
  .expense-hero-body {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  .expense-hero-stat-value {
    white-space: normal;
    overflow-wrap: anywhere;
  }
}
</style>
