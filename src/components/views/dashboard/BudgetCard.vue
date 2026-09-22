<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useNav } from '@/hooks/useNav'

const { t } = useI18n()
const nav = useNav()
</script>

<template>
  <div class="budget-card" role="button" tabindex="0" @click="nav.redirectTo('/budget')" @keyup.enter="nav.redirectTo('/budget')">
    <p class="budget-card-title">{{ t('dashboard.budget.title') }}</p>
    <p class="budget-card-desc">{{ t('dashboard.budget.desc') }}</p>
    <span class="budget-card-open">{{ t('dashboard.budget.open') }}</span>
  </div>
</template>

<style scoped>
.budget-card {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.budget-card:hover {
  border-color: var(--el-color-primary);
  background: var(--color-background-mute);
}

.budget-card-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
  margin: 0 0 8px;
}

.budget-card-desc {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.budget-card-open {
  align-self: flex-start;
  margin-top: 12px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--el-color-primary);
}
</style>
