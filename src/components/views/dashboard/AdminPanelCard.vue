<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useNav } from '@/hooks/useNav'

const { t } = useI18n()
const nav = useNav()
</script>

<template>
  <div class="admin-panel-card" role="button" tabindex="0" @click="nav.redirectTo('/admin')" @keyup.enter="nav.redirectTo('/admin')">
    <p class="admin-panel-title">{{ t('dashboard.adminPanel.title') }}</p>
    <p class="admin-panel-desc">{{ t('dashboard.adminPanel.desc') }}</p>
    <span class="admin-panel-open">{{ t('dashboard.adminPanel.open') }}</span>
  </div>
</template>

<style scoped>
.admin-panel-card {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  max-width: 300px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.admin-panel-card:hover {
  border-color: var(--el-color-primary);
  background: var(--color-background-mute);
}

.admin-panel-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
  margin: 0 0 8px;
}

.admin-panel-desc {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.admin-panel-open {
  align-self: flex-start;
  margin-top: 12px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--el-color-primary);
}
</style>
