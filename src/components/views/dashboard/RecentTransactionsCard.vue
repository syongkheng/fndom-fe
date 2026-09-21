<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useNav } from '@/hooks/useNav'
import { useApplePayStore } from '@/stores/applepay'

const { t } = useI18n()
const nav = useNav()
const store = useApplePayStore()
const { transactions, isLoading } = storeToRefs(store)

onMounted(() => {
  store.fetchTransactions()
})

// Already sorted newest-first server-side (ORDER BY occurred_dt DESC).
const recent = computed(() => transactions.value.slice(0, 3))

const formatAmount = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'SGD' })

const formatDate = (ts: number) =>
  new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="recent-tx-card" v-loading="isLoading">
    <p class="recent-tx-title">{{ t('dashboard.recentTransactions.title') }}</p>

    <div v-if="!isLoading && recent.length === 0" class="recent-tx-empty">
      {{ t('dashboard.recentTransactions.empty') }}
    </div>

    <ul v-else class="recent-tx-list">
      <li v-for="tx in recent" :key="tx.id" class="recent-tx-row">
        <div class="recent-tx-main">
          <span class="recent-tx-merchant">{{ tx.merchant }}</span>
          <span class="recent-tx-date">{{ formatDate(tx.occurredDt) }}</span>
        </div>
        <span class="recent-tx-amount">{{ formatAmount(tx.amount) }}</span>
      </li>
    </ul>

    <button type="button" class="recent-tx-view-all" @click="nav.redirectTo('/apple-pay')">
      {{ t('dashboard.recentTransactions.viewAll') }}
    </button>
  </div>
</template>

<style scoped>
.recent-tx-card {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  max-width: 300px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.recent-tx-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
  margin-bottom: 10px;
}

.recent-tx-empty {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.5;
  padding: 4px 0 8px;
}

.recent-tx-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recent-tx-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.recent-tx-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.recent-tx-merchant {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-tx-date {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.55;
}

.recent-tx-amount {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-heading);
  flex-shrink: 0;
}

.recent-tx-view-all {
  align-self: flex-start;
  margin-top: 12px;
  border: none;
  background: none;
  padding: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--el-color-primary);
  cursor: pointer;
}
</style>
