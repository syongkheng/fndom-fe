<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import RecentTransactionsCard from './RecentTransactionsCard.vue'
import LogSearchCard from './LogSearchCard.vue'
import { usePermission } from '@/composables/usePermission'

const { t } = useI18n()
const { hasRole } = usePermission()
</script>

<template>
  <div class="page-container">
    <div class="dash-widgets">
      <RecentTransactionsCard class="dash-widget" />
      <LogSearchCard v-if="hasRole('SYSTEM_R5')" class="dash-widget" />
    </div>

    <header class="dash-header">
      <p class="dash-eyebrow">{{ t('dashboard.eyebrow') }}</p>
      <h1 class="dash-title">{{ t('dashboard.title') }}</h1>
      <p class="dash-subtitle">{{ t('dashboard.subtitle') }}</p>
    </header>
  </div>
</template>

<style scoped>
.dash-widgets {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 24px;
}

.dash-widget {
  margin-top: 0;
}

.dash-header {
  padding: 40px 0;
}

.dash-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--el-color-primary);
  margin-bottom: 6px;
}

.dash-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-heading);
}

.dash-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
  margin-top: 6px;
}
</style>
