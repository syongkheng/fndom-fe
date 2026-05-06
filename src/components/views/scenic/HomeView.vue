<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useScenicStore, type ScenicSpot } from '@/stores/scenic'
import { storeToRefs } from 'pinia'

const store = useScenicStore()
const { loading, visitedCount, totalCount, spotsByProvince } = storeToRefs(store)

const searchQuery = ref('')
const expandedProvinces = ref<Set<string>>(new Set())

const filteredByProvince = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const map: Record<string, ScenicSpot[]> = {}

  for (const [province, spots] of Object.entries(spotsByProvince.value)) {
    const filtered = q
      ? spots.filter(
          s =>
            s.nameZh.includes(searchQuery.value.trim()) ||
            s.nameEn.toLowerCase().includes(q) ||
            s.province.includes(searchQuery.value.trim()) ||
            s.provinceEn.toLowerCase().includes(q) ||
            s.city.includes(searchQuery.value.trim()) ||
            s.cityEn.toLowerCase().includes(q),
        )
      : spots
    if (filtered.length) map[province] = filtered
  }

  return map
})

const sortedProvinces = computed(() => Object.keys(filteredByProvince.value).sort())

const isExpanded = (province: string) =>
  expandedProvinces.value.has(province) || searchQuery.value.trim().length > 0

const toggleProvince = (province: string) => {
  if (expandedProvinces.value.has(province)) expandedProvinces.value.delete(province)
  else expandedProvinces.value.add(province)
}

const provinceVisitedCount = (province: string) => {
  const spots = filteredByProvince.value[province] ?? []
  return spots.filter(s => store.isVisited(s.id)).length
}

onMounted(() => store.init())
</script>

<template>
  <div class="scenic-root">
    <div class="scenic-header">
      <div class="scenic-header-top">
        <h1 class="scenic-title">Scenic Spots <span class="scenic-title-zh">景区打卡</span></h1>
        <div class="progress-badge" v-if="totalCount > 0">
          <span class="progress-visited">{{ visitedCount }}</span>
          <span class="progress-sep">/</span>
          <span class="progress-total">{{ totalCount }}</span>
          <span class="progress-label">visited</span>
        </div>
      </div>
      <p class="scenic-subtitle">China AAAAA scenic spots · Check off the ones you've been to</p>
    </div>

    <div class="search-bar">
      <el-input
        v-model="searchQuery"
        placeholder="Search by name or province..."
        clearable
        :prefix-icon="'Search'"
      />
    </div>

    <div v-if="loading" class="state-block">
      <el-skeleton :rows="4" animated />
    </div>

    <div v-else-if="sortedProvinces.length === 0 && searchQuery" class="empty-state">
      No scenic spots matched "{{ searchQuery }}"
    </div>

    <div v-else class="province-list">
      <div
        v-for="province in sortedProvinces"
        :key="province"
        class="province-section"
      >
        <div class="province-header" @click="toggleProvince(province)">
          <div class="province-names">
            <span class="province-name-en">{{ province }}</span>
            <span class="province-name-zh">{{ filteredByProvince[province][0]?.province }}</span>
          </div>
          <div class="province-meta">
            <span
              class="province-badge"
              :class="{ 'province-badge--done': provinceVisitedCount(province) === filteredByProvince[province].length }"
            >
              {{ provinceVisitedCount(province) }}/{{ filteredByProvince[province].length }}
            </span>
            <span class="province-chevron" :class="{ expanded: isExpanded(province) }">›</span>
          </div>
        </div>

        <div v-show="isExpanded(province)" class="spot-list">
          <div
            v-for="spot in filteredByProvince[province]"
            :key="spot.id"
            class="spot-row"
            :class="{ 'spot-row--visited': store.isVisited(spot.id) }"
            @click="store.toggleVisited(spot.id)"
          >
            <span class="spot-checkbox" :class="{ checked: store.isVisited(spot.id) }">
              <span v-if="store.isVisited(spot.id)" class="checkmark">✓</span>
            </span>
            <div class="spot-names">
              <span class="spot-name-zh">{{ spot.nameZh }}</span>
              <span class="spot-name-en">{{ spot.nameEn }}</span>
            </div>
            <el-tag size="small" type="info" effect="plain" class="city-tag">{{ spot.city }}</el-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scenic-root {
  max-width: 720px;
  width: 100%;
  justify-self: center;
  display: flex;
  flex-direction: column;
  padding-bottom: 48px;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.scenic-header {
  padding: 24px 0 16px;
}

.scenic-header-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.scenic-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--color-heading);
  margin: 0 0 4px;
  line-height: 1.2;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.scenic-title-zh {
  font-size: 1rem;
  font-weight: 500;
  opacity: 0.5;
}

.scenic-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.65;
  margin: 0;
}

.progress-badge {
  display: flex;
  align-items: baseline;
  gap: 3px;
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}

.progress-visited {
  font-size: 1rem;
  font-weight: 800;
  color: var(--el-color-success);
}

.progress-sep {
  font-size: 0.85rem;
  opacity: 0.4;
}

.progress-total {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-heading);
}

.progress-label {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.5;
  margin-left: 2px;
}

/* ── Search ──────────────────────────────────────────────────────────────── */
.search-bar {
  margin-bottom: 16px;
}

/* ── States ──────────────────────────────────────────────────────────────── */
.state-block { margin-top: 20px; }

.empty-state {
  text-align: center;
  color: var(--color-text);
  opacity: 0.5;
  font-size: 0.9rem;
  padding: 40px 0;
}

/* ── Province list ───────────────────────────────────────────────────────── */
.province-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.province-section {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-background-soft);
}

.province-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.12s;
}

.province-header:hover {
  background: var(--color-background-mute);
}

.province-names {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.province-name-en {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
}

.province-name-zh {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.5;
}

.province-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.province-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.55;
  padding: 2px 7px;
  border-radius: 10px;
  background: var(--color-background-mute);
}

.province-badge--done {
  color: var(--el-color-success);
  opacity: 1;
  background: rgba(34, 197, 94, 0.1);
}

.province-chevron {
  font-size: 1.1rem;
  color: var(--color-text);
  opacity: 0.35;
  transition: transform 0.18s;
  line-height: 1;
}

.province-chevron.expanded {
  transform: rotate(90deg);
}

/* ── Spot rows ───────────────────────────────────────────────────────────── */
.spot-list {
  border-top: 1px solid var(--color-border);
}

.spot-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid var(--color-border);
}

.spot-row:last-child {
  border-bottom: none;
}

.spot-row:hover {
  background: var(--color-background-mute);
}

.spot-row--visited {
  background: rgba(34, 197, 94, 0.04);
}

.spot-checkbox {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1.5px solid var(--color-border-hover);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  transition: background 0.1s, border-color 0.1s;
}

.spot-checkbox.checked {
  background: var(--el-color-success);
  border-color: var(--el-color-success);
}

.checkmark {
  font-size: 0.7rem;
  color: #fff;
  font-weight: 700;
  line-height: 1;
}

.spot-names {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.spot-name-zh {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.spot-name-en {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.55;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.city-tag {
  flex-shrink: 0;
  font-size: 0.72rem;
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 425px) {
  .scenic-title { font-size: 1.15rem; }
  .city-tag { display: none; }
}
</style>
