<script setup lang="ts">
import { computed } from 'vue'
import { useNav } from '@/hooks/useNav'
import { usePermission } from '@/composables/usePermission'
import { useI18n } from 'vue-i18n'

const nav = useNav()
const { hasModuleAccess } = usePermission()
const { t } = useI18n()

const MODULE_ICONS: Record<string, string> = {
  pphs: '🏢', flat: '🏠', scenic: '🏔️', travel: '✈️',
  douyin: '📺', telegram: '📦', imghost: '🖼️', ippt: '🪖', marketplace: '🛒', bus: '🚌',
}
const MODULE_PATHS: Record<string, string> = {
  pphs: '/pphs', flat: '/flat', scenic: '/scenic', travel: '/travel',
  douyin: '/douyin', telegram: '/telegram', imghost: '/imghost', ippt: '/ippt', marketplace: '/llm', bus: '/bus',
}
const MODULE_KEYS = ['pphs', 'flat', 'scenic', 'travel', 'douyin', 'telegram', 'imghost', 'ippt', 'marketplace', 'bus'] as const

const modules = computed(() =>
  MODULE_KEYS.map(key => ({
    key,
    title: t(`workbench.tiles.${key}.label`),
    description: t(`workbench.tiles.${key}.desc`),
    icon: MODULE_ICONS[key],
    path: MODULE_PATHS[key],
  }))
)
</script>

<template>
  <div class="page-container">
    <section class="workbench-header">
      <p class="workbench-eyebrow">{{ t('workbench.eyebrow') }}</p>
      <h1 class="workbench-title">{{ t('workbench.title') }}</h1>
      <p class="workbench-subtitle">{{ t('workbench.subtitle') }}</p>
    </section>

    <div class="module-grid">
      <div
        v-for="mod in modules"
        :key="mod.key"
        class="module-tile"
        @click="nav.redirectTo(mod.path)"
      >
        <div class="tile-icon-wrap">{{ mod.icon }}</div>
        <div class="tile-body">
          <div class="tile-title">{{ mod.title }}</div>
          <div class="tile-desc">{{ mod.description }}</div>
        </div>
        <span class="tile-arrow">→</span>
      </div>

      <div
        v-if="hasModuleAccess('SYSTEM', 5)"
        class="module-tile module-tile--admin"
        @click="nav.redirectTo('/admin')"
      >
        <div class="tile-icon-wrap tile-icon-wrap--admin">⚙️</div>
        <div class="tile-body">
          <div class="tile-title">{{ t('workbench.tiles.admin.label') }}</div>
          <div class="tile-desc">{{ t('workbench.tiles.admin.desc') }}</div>
        </div>
        <span class="tile-arrow">→</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workbench-header {
  padding: 40px 16px 32px;
}

.workbench-eyebrow {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--el-color-primary);
  margin-bottom: 8px;
}

.workbench-title {
  font-size: 1.9rem;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: var(--color-heading);
  margin-bottom: 6px;
}

.workbench-subtitle {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.55;
}

/* Grid */
.module-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 860px;
  padding: 0 16px 40px;
}

/* Tile */
.module-tile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 16px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  cursor: pointer;
  background: var(--color-background-soft);
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.module-tile:hover {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 4%, var(--color-background-soft));
  box-shadow: 0 4px 16px color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}

.module-tile--admin {
  border-style: dashed;
  opacity: 0.7;
}

.module-tile--admin:hover {
  border-color: var(--el-color-danger);
  opacity: 1;
  background: color-mix(in srgb, var(--el-color-danger) 4%, var(--color-background-soft));
  box-shadow: 0 4px 16px color-mix(in srgb, var(--el-color-danger) 10%, transparent);
}

/* Icon wrapper */
.tile-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  font-size: 1.35rem;
  flex-shrink: 0;
  transition: background 0.15s;
}

.module-tile:hover .tile-icon-wrap {
  background: color-mix(in srgb, var(--el-color-primary) 16%, transparent);
}

.tile-icon-wrap--admin {
  background: color-mix(in srgb, var(--el-color-danger) 10%, transparent);
}

/* Body */
.tile-body {
  flex: 1;
  min-width: 0;
}

.tile-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 3px;
}

.tile-desc {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.58;
  line-height: 1.4;
}

/* Arrow */
.tile-arrow {
  font-size: 0.95rem;
  color: var(--el-color-primary);
  opacity: 0;
  flex-shrink: 0;
  transition: opacity 0.15s, transform 0.15s;
  transform: translateX(-4px);
}

.module-tile:hover .tile-arrow {
  opacity: 0.8;
  transform: translateX(0);
}

/* Responsive */
@media (min-width: 640px) {
  .module-grid { grid-template-columns: repeat(3, 1fr); }
  .workbench-title { font-size: 2.3rem; }
}
</style>
