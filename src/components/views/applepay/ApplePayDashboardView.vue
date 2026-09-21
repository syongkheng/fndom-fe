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

    <el-table v-else :data="filteredTransactions" size="small" class="transactions-table">
      <el-table-column :label="t('applepay.col.date')" min-width="150">
        <template #default="{ row }">{{ formatDate(row.occurredDt) }}</template>
      </el-table-column>
      <el-table-column :label="t('applepay.col.merchant')" min-width="160" prop="merchant" />
      <el-table-column :label="t('applepay.col.name')" min-width="160" prop="name" />
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
