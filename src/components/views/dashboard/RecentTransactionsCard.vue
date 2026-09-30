<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useNav } from '@/hooks/useNav'
import { useApplePayStore } from '@/stores/applepay'
import { useSsApiKeyStore } from '@/stores/ssApiKey'

const { t } = useI18n()
const nav = useNav()
const store = useApplePayStore()
const ssKeyStore = useSsApiKeyStore()
const { transactions, isLoading } = storeToRefs(store)

// null = unknown (still loading or request failed) — only a confirmed
// "no key" switches the empty state to the setup call-to-action.
const hasKey = ref<boolean | null>(null)

onMounted(async () => {
  store.fetchTransactions()
  hasKey.value = await ssKeyStore
    .fetchApiKeyStatus()
    .then((s) => s.hasKey)
    .catch(() => null)
})

// Already sorted newest-first server-side (ORDER BY occurred_dt DESC).
const recent = computed(() => transactions.value.slice(0, 4))

const monthTransactions = computed(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  return transactions.value.filter((tx) => tx.occurredDt >= start)
})

const monthTotal = computed(() => monthTransactions.value.reduce((sum, tx) => sum + tx.amount, 0))

const monthLabel = computed(() => new Date().toLocaleString(undefined, { month: 'long' }))

const isEmpty = computed(() => !isLoading.value && transactions.value.length === 0)

const formatAmount = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'SGD' })

const formatDate = (ts: number) =>
  new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const openTracker = () => nav.redirectTo('/apple-pay')
</script>

<template>
  <section class="expense-hero" v-loading="isLoading">
    <div class="expense-hero-head">
      <div>
        <p class="expense-hero-eyebrow">{{ t('dashboard.expenseTracker.eyebrow') }}</p>
        <h2 class="expense-hero-title">{{ t('dashboard.expenseTracker.title') }}</h2>
      </div>
      <el-button v-if="!isEmpty" type="primary" @click="openTracker">
        {{ t('dashboard.expenseTracker.viewAll') }}
      </el-button>
    </div>

    <!-- Empty: guide the user into the Shortcut setup -->
    <div v-if="isEmpty" class="expense-hero-empty">
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
        <span class="expense-hero-stat-value">{{ formatAmount(monthTotal) }}</span>
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
            <span class="expense-hero-amount">{{ formatAmount(tx.amount) }}</span>
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
  padding: 20px 22px;
  border-radius: 16px;
  background: var(--color-background-soft);
  border: 1px solid var(--el-color-primary-light-7);
  box-shadow: 0 1px 0 var(--el-color-primary-light-9) inset;
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
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 24px;
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

  .expense-hero-body {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
}
</style>
