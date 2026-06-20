<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useMarketplaceStore } from '@/stores/marketplace'
import ServiceCard from './ServiceCard.vue'
import type { LLMModel } from '@/interfaces/Marketplace.model'

const store = useMarketplaceStore()
const query = ref('')

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return store.models
  return store.models.filter(
    s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.provider.toLowerCase().includes(q),
  )
})

function handleSelect(service: LLMModel) {
  store.setModel(service.id)
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title">Services</div>
    </div>

    <div class="search-wrap">
      <el-input
        v-model="query"
        placeholder="Search..."
        :prefix-icon="Search"
        clearable
        size="small"
        class="search-input"
      />
    </div>

    <div class="section-label" v-if="!query">All</div>

    <div class="row-list">
      <ServiceCard
        v-for="svc in filtered"
        :key="svc.id"
        :service="svc"
        :is-selected="store.selectedModel?.id === svc.id"
        @select="handleSelect"
      />

      <div v-if="filtered.length === 0" class="empty-search">
        No results for "{{ query }}"
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border);
  background: var(--color-background-soft);
  overflow: hidden;
}

.sidebar-header {
  padding: 20px 16px 0;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text);
  opacity: 0.4;
}

.search-wrap {
  padding: 12px 12px 6px;
  flex-shrink: 0;
}

.search-input {
  width: 100%;
}

.section-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--color-text);
  opacity: 0.3;
  padding: 8px 16px 4px;
  flex-shrink: 0;
}

.row-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.empty-search {
  text-align: center;
  padding: 32px 16px;
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.35;
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    max-height: 300px;
  }
}
</style>
