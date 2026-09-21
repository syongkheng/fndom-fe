<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { Expand, Fold } from '@element-plus/icons-vue'
import TravelIcon from '@/components/icons/TravelIcon.vue'

export interface PlannerNavSection {
  key: string
  labelKey: string
  icon: string
  count?: number
}

const props = defineProps<{
  sections: PlannerNavSection[]
  active: string
  collapsed: boolean
}>()

const emit = defineEmits<{
  (e: 'update:active', key: string): void
  (e: 'update:collapsed', v: boolean): void
}>()

const { t } = useI18n()
</script>

<template>
  <nav class="planner-side-nav" :class="{ 'planner-side-nav--collapsed': collapsed }">
    <button
      class="nav-toggle"
      type="button"
      @click="emit('update:collapsed', !collapsed)"
      :title="t(collapsed ? 'travel.nav.expand' : 'travel.nav.collapse')"
    >
      <el-icon><component :is="collapsed ? Expand : Fold" /></el-icon>
    </button>

    <button
      v-for="s in sections"
      :key="s.key"
      type="button"
      class="nav-item"
      :class="{ 'nav-item--active': s.key === props.active }"
      @click="emit('update:active', s.key)"
      :title="t(s.labelKey)"
    >
      <span class="nav-item-icon"><TravelIcon :svg="s.icon" /></span>
      <span v-if="!collapsed" class="nav-item-label">{{ t(s.labelKey) }}</span>
      <span v-if="s.count" class="nav-item-count">{{ s.count }}</span>
    </button>
  </nav>
</template>

<style scoped>
.planner-side-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 200px;
  flex-shrink: 0;
  padding-right: 12px;
  border-right: 1px solid var(--color-border);
  transition: width 0.15s ease;
}

.planner-side-nav--collapsed {
  width: 52px;
}

.nav-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: flex-end;
  width: 28px;
  height: 28px;
  margin-bottom: 6px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
}

.planner-side-nav--collapsed .nav-toggle {
  align-self: center;
}

.nav-toggle:hover {
  background: var(--el-fill-color-light, #f5f7fa);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  color: var(--color-text);
  font-size: 0.85rem;
  transition: background 0.12s, color 0.12s;
}

.planner-side-nav--collapsed .nav-item {
  justify-content: center;
  padding: 9px;
}

.nav-item:hover {
  background: var(--el-fill-color-light, #f5f7fa);
}

.nav-item--active {
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  color: var(--el-color-primary);
  font-weight: 600;
}

.nav-item-icon {
  display: inline-flex;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.nav-item-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item-count {
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--el-fill-color, #f0f0f0);
  color: var(--color-text);
  font-size: 0.68rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-item--active .nav-item-count {
  background: var(--el-color-primary);
  color: #fff;
}
</style>
