<script setup lang="ts">
import { onMounted, ref } from 'vue'
import axios from 'axios'
import type { OneMapResult } from '@/interfaces/OneMapResult.model'
import FlatAnalysisCard from '@/components/cards/flat/FlatAnalysisCard.vue'
import FlatMapComponent from '@/components/map/FlatMapComponent.vue'

const postalCode = ref('')
const loading = ref(false)
const searched = ref(false)
const results = ref<OneMapResult[]>([])
const errorMsg = ref('')
const mapExpanded = ref(true)

const getCardId = (postal: string, index: number) => `flat-card-${postal}-${index}`

const search = async () => {
  const code = postalCode.value.trim()
  if (!code) {
    errorMsg.value = 'Please enter a postal code.'
    return
  }
  if (!/^\d{6}$/.test(code)) {
    errorMsg.value = 'Please enter a valid 6-digit Singapore postal code.'
    return
  }

  errorMsg.value = ''
  loading.value = true
  searched.value = false
  results.value = []

  try {
    const res = await axios.get('https://www.onemap.gov.sg/api/common/elastic/search', {
      params: { searchVal: code, returnGeom: 'Y', getAddrDetails: 'Y', pageNum: 1 },
    })
    results.value = (res.data.results ?? []).filter(
      (r: OneMapResult) => r.LATITUDE && r.LONGITUDE
    )
    searched.value = true
  } catch {
    errorMsg.value = 'Failed to fetch results. Please try again.'
  } finally {
    loading.value = false
  }
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') search()
}

onMounted(() => {
  ;(window as any).__flatScrollToCard = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
})
</script>

<template>
  <div class="flat-root">
    <!-- Header -->
    <div class="flat-header">
      <div>
        <h1 class="flat-title">Flat Analysis</h1>
        <p class="flat-subtitle">Search by Singapore postal code for MRT and bus stop proximity</p>
      </div>
    </div>

    <!-- Search bar -->
    <div class="search-bar">
      <el-input
        v-model="postalCode"
        placeholder="Enter 6-digit postal code"
        maxlength="6"
        :status="errorMsg ? 'error' : ''"
        @keydown="onKeydown"
        clearable
      />
      <el-button type="primary" :loading="loading" @click="search">Search</el-button>
    </div>
    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <template v-if="!loading && searched">
      <!-- Stats bar -->
      <div v-if="results.length" class="flat-stats">
        <div class="stat-pill">
          <span class="stat-value">{{ results.length }}</span>
          <span class="stat-label">Result{{ results.length !== 1 ? 's' : '' }}</span>
        </div>
        <div class="stat-spacer" />
        <el-button link size="small" class="map-toggle-btn" @click="mapExpanded = !mapExpanded">
          {{ mapExpanded ? 'Hide map ▲' : 'Show map ▼' }}
        </el-button>
      </div>

      <!-- Map -->
      <div v-if="results.length" class="flat-map-wrap" :class="{ collapsed: !mapExpanded }">
        <FlatMapComponent :results="results" />
      </div>

      <!-- Cards -->
      <div v-if="results.length" class="flat-list">
        <div
          v-for="(result, i) in results"
          :key="`${result.POSTAL}-${i}`"
          :id="getCardId(result.POSTAL, i)"
        >
          <FlatAnalysisCard :result="result" />
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="flat-empty">
        <div class="flat-empty-icon">🔍</div>
        <p>No results found for postal code <strong>{{ postalCode }}</strong></p>
      </div>
    </template>

    <!-- Skeleton loader -->
    <div v-if="loading" class="state-block">
      <el-skeleton :rows="4" animated />
    </div>
  </div>

  <el-backtop :right="20" :bottom="24" />
</template>

<style scoped>
.flat-root {
  max-width: 900px;
  width: 100%;
  justify-self: center;
  display: flex;
  flex-direction: column;
  padding-bottom: 48px;
}

.flat-header {
  padding: 24px 0 16px;
}

.flat-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 6px;
  line-height: 1.2;
}

.flat-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.65;
  line-height: 1.55;
  margin: 0;
}

.search-bar {
  display: flex;
  gap: 8px;
  max-width: 400px;
  margin-bottom: 6px;
}

.error-msg {
  font-size: 0.82rem;
  color: var(--el-color-danger);
  margin-bottom: 12px;
}

/* Stats */
.flat-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  margin: 16px 0 12px;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 44px;
}

.stat-value {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-heading);
  line-height: 1;
}

.stat-label {
  font-size: 0.68rem;
  color: var(--color-text);
  opacity: 0.55;
  white-space: nowrap;
}

.stat-spacer {
  flex: 1;
}

.map-toggle-btn {
  font-size: 0.78rem;
  color: var(--el-color-primary);
  padding: 0;
}

/* Map */
.flat-map-wrap {
  height: 380px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  margin-bottom: 20px;
  transition: height 0.3s ease, opacity 0.3s ease, margin 0.3s ease;
}

.flat-map-wrap.collapsed {
  height: 0;
  opacity: 0;
  margin-bottom: 0;
  border: none;
}

/* Cards */
.flat-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flat-empty {
  text-align: center;
  padding: 60px 0;
  color: var(--color-text);
  opacity: 0.5;
}

.flat-empty-icon {
  font-size: 2.4rem;
  margin-bottom: 10px;
}

.state-block {
  margin-top: 32px;
  max-width: 600px;
}

/* Mobile */
@media (max-width: 600px) {
  .flat-map-wrap {
    height: 260px;
  }

  .flat-title {
    font-size: 1.15rem;
  }
}
</style>
