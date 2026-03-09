<script setup lang="ts">
import { ApiRoute } from '@/constants/ApiRoute'
import type { ResaleTransaction } from '@/interfaces/ResaleTransaction.model'
import axios from 'axios'
import { computed, ref } from 'vue'

const props = defineProps<{
  block: string
  streetName: string
}>()

const loading = ref(false)
const fetched = ref(false)
const transactions = ref<ResaleTransaction[]>([])
const selectedFlatType = ref<string>('ALL')

const flatTypeOptions = computed(() => {
  const types = [...new Set(transactions.value.map((t) => t.flat_type))].sort()
  return ['ALL', ...types]
})

const filtered = computed(() =>
  selectedFlatType.value === 'ALL'
    ? transactions.value
    : transactions.value.filter((t) => t.flat_type === selectedFlatType.value)
)

const stats = computed(() => {
  if (!filtered.value.length) return null
  const prices = filtered.value.map((t) => Number(t.resale_price))
  const sorted = [...prices].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  return {
    count: filtered.value.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    median,
  }
})

const formatPrice = (val: number) =>
  '$' + val.toLocaleString('en-SG', { maximumFractionDigits: 0 })

const fetch = async () => {
  loading.value = true
  fetched.value = false
  try {
    const res = await axios.get(ApiRoute.DATA_GOV_SG.HDB_RESALE_PRICES, {
      params: {
        resource_id: ApiRoute.DATA_GOV_SG.HDB_RESALE_RESOURCE_ID,
        filters: JSON.stringify({ block: props.block, street_name: props.streetName }),
        sort: 'month desc',
        limit: 100,
      },
    })
    transactions.value = res.data.result?.records ?? []
    fetched.value = true
  } catch {
    transactions.value = []
    fetched.value = true
  } finally {
    loading.value = false
  }
}

// Lazy-load on first expand — parent calls this via template ref
defineExpose({ fetch })
</script>

<template>
  <div class="resale-section">
    <div v-if="loading" class="resale-loading">
      <el-skeleton :rows="3" animated />
    </div>

    <template v-else-if="fetched">
      <!-- Empty -->
      <div v-if="!transactions.length" class="resale-empty">
        No resale transactions found for this block.
      </div>

      <template v-else>
        <!-- Flat type filter -->
        <div class="filter-row">
          <el-segmented
            v-model="selectedFlatType"
            :options="flatTypeOptions.map(t => ({ label: t === 'ALL' ? 'All Types' : t, value: t }))"
            size="small"
          />
        </div>

        <!-- Summary stats -->
        <div v-if="stats" class="stats-row">
          <div class="stat-item">
            <span class="stat-val">{{ stats.count }}</span>
            <span class="stat-lbl">Transactions</span>
          </div>
          <div class="stat-divider" />
          <div class="stat-item">
            <span class="stat-val">{{ formatPrice(stats.median) }}</span>
            <span class="stat-lbl">Median</span>
          </div>
          <div class="stat-divider" />
          <div class="stat-item">
            <span class="stat-val">{{ formatPrice(stats.min) }}</span>
            <span class="stat-lbl">Lowest</span>
          </div>
          <div class="stat-divider" />
          <div class="stat-item">
            <span class="stat-val">{{ formatPrice(stats.max) }}</span>
            <span class="stat-lbl">Highest</span>
          </div>
        </div>

        <!-- Transaction table -->
        <div class="table-wrap">
          <table class="txn-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Type</th>
                <th>Storey</th>
                <th>Area</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(txn, i) in filtered" :key="i">
                <td class="col-mono">{{ txn.month }}</td>
                <td>{{ txn.flat_type }}</td>
                <td class="col-muted">{{ txn.storey_range }}</td>
                <td class="col-mono">{{ txn.floor_area_sqm }} m²</td>
                <td class="col-price">{{ formatPrice(Number(txn.resale_price)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.resale-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
}

.resale-loading,
.resale-empty {
  padding: 8px 0;
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.55;
  font-style: italic;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
}

/* Stats */
.stats-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-val {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.stat-lbl {
  font-size: 0.65rem;
  color: var(--color-text);
  opacity: 0.5;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.stat-divider {
  width: 1px;
  height: 20px;
  background: var(--color-border);
  flex-shrink: 0;
}

/* Table */
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.txn-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.txn-table th {
  text-align: left;
  padding: 7px 10px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text);
  opacity: 0.5;
  background: var(--color-background-mute);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.txn-table td {
  padding: 6px 10px;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.txn-table tr:last-child td {
  border-bottom: none;
}

.txn-table tr:hover td {
  background: var(--color-background-mute);
}

.col-mono {
  font-variant-numeric: tabular-nums;
}

.col-muted {
  opacity: 0.65;
}

.col-price {
  font-weight: 600;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}
</style>
