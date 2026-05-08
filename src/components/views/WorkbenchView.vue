<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useNav } from '@/hooks/useNav'
import { usePermission } from '@/composables/usePermission'
import { useFeatureFlagStore } from '@/stores/featureFlags'

const nav = useNav()
const { hasModuleAccess } = usePermission()
const flagStore = useFeatureFlagStore()

onMounted(async () => {
  if (!flagStore.loaded) await flagStore.fetchFlags()
})

const modules = [
  // {
  //   key: 'dashboard',
  //   title: 'Dashboard',
  //   description: 'Overview of your activity and stats',
  //   icon: '📊',
  //   path: '/dashboard',
  // },
  // {
  //   key: 'schedule',
  //   title: 'Schedule',
  //   description: 'Calendar and event scheduling',
  //   icon: '📅',
  //   path: '/schedule',
  // },
  {
    key: 'pphs',
    featureKey: 'pphs',
    title: 'PPHS',
    description: 'Public housing info, bus stops and MRT proximity',
    icon: '🏢',
    path: '/pphs',
  },
  {
    key: 'flat',
    featureKey: 'flat-analysis',
    title: 'Flat Analysis',
    description: 'Search by postal code · MRT and bus stop proximity',
    icon: '🏠',
    path: '/flat',
  },
  {
    key: 'scenic',
    featureKey: 'china-scenic',
    title: 'Scenic Spots',
    description: 'China 5A scenic spots · Track your visits by province',
    icon: '🏔️',
    path: '/scenic',
  },
  {
    key: 'travel',
    featureKey: 'travel',
    title: 'Travel',
    description: 'Itinerary planning and collaboration',
    icon: '✈️',
    path: '/travel',
  },
  {
    key: 'douyin',
    featureKey: 'douyin',
    title: 'Douyin Live',
    description: 'Check if a Douyin user is livestreaming',
    icon: '📺',
    path: '/douyin',
  },
  {
    key: 'sleep',
    featureKey: 'sleep',
    title: 'Sleep',
    description: 'Track nightly sleep stages, SpO2 and body battery',
    icon: '😴',
    path: '/sleep',
  },
  {
    key: 'expense',
    featureKey: 'expense',
    title: 'Expense',
    description: 'Track your budget, spendings and earnings',
    icon: '💰',
    path: '/expense',
  },
  {
    key: 'telegram',
    featureKey: 'telegram',
    title: 'Telegram Storage',
    description: 'Upload media via Telegram bot and retrieve by ID',
    icon: '📦',
    path: '/telegram',
  },
  // {
  //   key: 'habit',
  //   title: 'Habit',
  //   description: 'Track and build daily habits',
  //   icon: '📋',
  //   path: '/habit',
  // },
]

const visibleModules = computed(() =>
  modules.filter(m => flagStore.isEnabled(m.featureKey))
)
</script>

<template>
  <div class="page-container">
    <section class="workbench-header">
      <h1 class="workbench-title">Workbench</h1>
      <p class="workbench-subtitle">Pick a module to get started</p>
    </section>

    <div class="module-grid">
      <div v-for="mod in visibleModules" :key="mod.key" class="module-tile" @click="nav.redirectTo(mod.path)">
        <span class="module-icon">{{ mod.icon }}</span>
        <div class="module-text">
          <div class="module-title">{{ mod.title }}</div>
          <div class="module-desc">{{ mod.description }}</div>
        </div>
      </div>

      <div v-if="hasModuleAccess('SYSTEM', 5)" class="module-tile module-tile--admin" @click="nav.redirectTo('/admin')">
        <span class="module-icon">⚙️</span>
        <div class="module-text">
          <div class="module-title">Admin</div>
          <div class="module-desc">Manage users, roles, and feature flags</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workbench-header {
  text-align: center;
  padding: 28px 16px 32px;
  margin-bottom: 8px;
}

.workbench-title {
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: 0.3px;
  color: var(--color-heading);
}

.workbench-subtitle {
  margin-top: 6px;
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.6;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 800px;
  margin: 0 auto;
}

.module-tile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 16px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
  background: var(--color-background-soft);
}

.module-tile:hover {
  border-color: var(--color-border-hover);
  background: var(--color-background-mute);
}

.module-tile--admin {
  border-style: dashed;
  opacity: 0.75;
}

.module-tile--admin:hover {
  border-color: var(--el-color-danger);
  opacity: 1;
}

.module-icon {
  font-size: 1.6rem;
  flex-shrink: 0;
}

.module-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
}

.module-desc {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.65;
  margin-top: 2px;
  line-height: 1.4;
}

@media (min-width: 640px) {
  .module-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .workbench-title {
    font-size: 2.2rem;
  }
}
</style>
