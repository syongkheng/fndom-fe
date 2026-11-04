<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNav } from '@/hooks/useNav'

const { t } = useI18n()
const route = useRoute()
const { redirectTo } = useNav()

// Phone-only tab bar (super-app style): the four everyday modules one thumb away.
const tabs = computed(() => [
  { key: 'workbench', icon: 'lantern', label: t('nav.workbench'), path: '/' },
  { key: 'house', icon: 'home', label: t('nav.house'), path: '/house' },
  { key: 'budget', icon: 'wallet', label: t('nav.budget'), path: '/budget' },
  { key: 'trips', icon: 'suitcase', label: t('nav.trips'), path: '/travel/trips' },
])

const isActive = (path: string) =>
  path === '/' ? route.path === '/' : route.path === path || route.path.startsWith(`${path}/`)
</script>

<template>
  <nav class="tabbar" :aria-label="t('nav.menu')">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      class="tab"
      :class="{ active: isActive(tab.path) }"
      @click="redirectTo(tab.path)"
    >
      <span class="tab-icon" aria-hidden="true"><AppIcon :name="tab.icon" size="24px" /></span>
      <span class="tab-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.tabbar {
  display: none;
}

@media (max-width: 800px) {
  .tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9998;
    display: flex;
    justify-content: space-around;
    height: var(--tabbar-h);
    padding-bottom: env(safe-area-inset-bottom);
    background: color-mix(in srgb, var(--color-background-soft) 92%, transparent);
    backdrop-filter: blur(14px);
    border-top: 1px solid var(--color-divider);
    box-shadow: 0 -6px 20px rgba(120, 62, 30, 0.08);
  }
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.15s;
}

.tab-icon {
  display: grid;
  place-items: center;
  line-height: 1;
  opacity: 0.8;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s;
}

.tab.active {
  color: var(--color-primary);
}

.tab.active .tab-icon {
  opacity: 1;
  transform: translateY(-3px) scale(1.18);
}

.tab:active .tab-icon {
  transform: scale(0.9);
}
</style>
