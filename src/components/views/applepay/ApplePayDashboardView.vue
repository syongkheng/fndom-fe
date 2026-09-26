<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useApplePayStore } from '@/stores/applepay'
import { useToast } from '@/composables/useToast'
import { storeToRefs } from 'pinia'
import { DEFAULT_APPLEPAY_CATEGORIES } from '@/constants/ApplePayCategories'
import type { ApplePayTransaction } from '@/interfaces/ApplePayTransaction.model'

const { t } = useI18n()
const store = useApplePayStore()
const toast = useToast()
const { transactions, isLoading } = storeToRefs(store)

onMounted(() => {
  store.fetchTransactions()
})

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

const formatAmount = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'SGD' })

const formatDate = (ts: number) =>
  new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// V1 rows (NFC taps) carry an Apple Pay device name; V2 rows (bank email
// forwarding) carry a card number instead — surface whichever the row has.
const formatDetail = (tx: ApplePayTransaction) => tx.name ?? (tx.cardLast4 ? `•• ${tx.cardLast4}` : '—')
const sourceLabel = (source: string) => (source === 'v2' ? t('applepay.sourceEmail') : t('applepay.sourceNfc'))

const savingId = ref<string | null>(null)

const onCategoryChange = async (tx: ApplePayTransaction) => {
  savingId.value = tx.id
  const ok = await store.updateCategory(tx.id, tx.category?.trim() || null)
  savingId.value = null
  if (!ok) toast.error(t('applepay.saveFailed'))
}
</script>

<template>
  <div class="page-container">
    <header class="list-header">
      <div>
        <p class="list-eyebrow">{{ t('applepay.eyebrow') }}</p>
        <h1 class="list-title">{{ t('applepay.title') }}</h1>
        <p class="list-subtitle">{{ t('applepay.subtitle') }}</p>
      </div>
      <div class="summary-block">
        <span class="summary-label">{{ categoryFilter ? t('applepay.filteredTotal') : t('applepay.total') }}</span>
        <span class="summary-value">{{ formatAmount(totalAmount) }}</span>
      </div>
    </header>

    <div class="filter-row">
      <el-select v-model="categoryFilter" clearable :placeholder="t('applepay.allCategories')" class="category-filter">
        <el-option v-for="opt in categoryOptions" :key="opt" :label="opt" :value="opt" />
      </el-select>
      <span class="count-label">{{ t('applepay.transactionCount', { n: filteredTransactions.length }) }}</span>
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
        <el-table-column :label="t('applepay.col.name')" min-width="140">
          <template #default="{ row }">{{ formatDetail(row) }}</template>
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
              <span class="tx-card-name">{{ formatDetail(row) }}</span>
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
  </div>
</template>

<style scoped>
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
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

.summary-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 10px 18px;
  border-radius: 12px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.summary-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.55;
}

.summary-value {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--color-heading);
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

.count-label {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.6;
}

.category-select {
  width: 100%;
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

@media (max-width: 540px) {
  .list-header {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-block {
    align-items: flex-start;
  }
}
</style>
