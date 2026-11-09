<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHousePlanStore } from '@/stores/housePlan'
import { useHouseLayoutsStore } from '@/stores/houseLayouts'

const { t } = useI18n()
const store = useHousePlanStore()
const layouts = useHouseLayoutsStore()

/** Blank plan: point at the two ways to start. Hidden while a tool or dialog owns the canvas. */
const showEmpty = computed(() => !store.items.length && !store.wallTool && !store.measuring && !store.builder && !layouts.dialogOpen)
const tips = ['resize', 'rotate', 'menu', 'snap', 'help'] as const
</script>

<template>
  <div v-if="showEmpty" class="empty" role="status">
    <div class="card bp-panel">
      <strong>{{ t('house.empty.title') }}</strong>
      <p>{{ t('house.empty.body') }}</p>
      <button type="button" class="bp-btn" @click="layouts.detach(); store.loadSample()">{{ t('house.tools.samplePlan') }}</button>
    </div>
  </div>

  <aside v-if="!store.tipsSeen" class="tips bp-panel" role="note">
    <strong>{{ t('house.tips.title') }}</strong>
    <ul>
      <li v-for="k in tips" :key="k">{{ t(`house.tips.${k}`) }}</li>
    </ul>
    <button type="button" class="bp-btn small" @click="store.dismissTips()">{{ t('house.tips.dismiss') }}</button>
  </aside>
</template>

<style scoped>
.empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  z-index: 4;
}
.card {
  pointer-events: auto;
  max-width: 320px;
  padding: 18px 20px;
  text-align: center;
  background: var(--color-background-soft);
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}
.card p {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}
.tips {
  position: absolute;
  left: 8px;
  bottom: 8px;
  z-index: 5;
  max-width: 290px;
  padding: 12px 14px;
  background: var(--color-background-soft);
  font-size: 12px;
}
.tips ul {
  margin: 6px 0 10px;
  padding-left: 16px;
  line-height: 1.5;
}
.small {
  min-height: 28px;
  padding: 4px 12px;
}
@media (max-width: 760px) {
  .tips {
    display: none; /* no room next to the plan on a phone; the ? sheet has the same list */
  }
}
</style>
