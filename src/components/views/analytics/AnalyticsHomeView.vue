<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import PageBackButton from '@/components/common/PageBackButton.vue'
import { useNav } from '@/hooks/useNav'
import { useAnalyticsStore } from '@/stores/analytics'

const { t } = useI18n()
const nav = useNav()
const store = useAnalyticsStore()
const { systems } = storeToRefs(store)
const loading = ref(true)

onMounted(async () => {
  await store.loadSystems(true)
  loading.value = false
})
</script>

<template>
  <div class="page-container an-home">
    <div class="an-header">
      <PageBackButton />
      <div>
        <h1 class="an-title">{{ t('analytics.title') }}</h1>
        <p class="an-subtitle">{{ t('analytics.subtitle') }}</p>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="4" animated />

    <p v-else-if="!systems.length" class="an-empty">{{ t('analytics.empty') }}</p>

    <div v-else class="an-cards">
      <button
        v-for="s in systems"
        :key="s.key"
        type="button"
        class="an-card"
        @click="nav.redirectTo(`/analytics/${s.key}`)"
      >
        <span class="an-card-body">
          <span class="an-card-title">{{ s.displayName }}</span>
          <span class="an-card-key">{{ s.key }}</span>
        </span>
        <span class="an-card-open">{{ t('analytics.open') }} →</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.an-home {
  max-width: 720px;
  width: 100%;
  justify-self: center;
  padding-bottom: 48px;
}

.an-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 24px 0 24px;
}

.an-title {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--color-heading);
  margin: 0 0 4px;
}

.an-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.55;
  margin: 0;
}

.an-empty {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.6;
  padding: 24px 0;
}

.an-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.an-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-background-soft);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.an-card:hover,
.an-card:focus-visible {
  border-color: var(--color-primary);
  background: var(--color-background-mute);
}

.an-card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.an-card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
}

.an-card-key {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.5;
}

.an-card-open {
  flex-shrink: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-primary);
}
</style>
