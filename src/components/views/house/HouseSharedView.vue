<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import FurnitureMenu from '@/components/house/FurnitureMenu.vue'
import PlannerCanvas from '@/components/house/PlannerCanvas.vue'
import RoomLegend from '@/components/house/RoomLegend.vue'
import ViewPanel from '@/components/house/ViewPanel.vue'
import { ApiRoute } from '@/constants/ApiRoute'
import HttpClient from '@/interceptors/HttpClient'
import { useNav } from '@/hooks/useNav'
import { useHousePlanStore } from '@/stores/housePlan'

const { t } = useI18n()
const route = useRoute()
const nav = useNav()
const store = useHousePlanStore()

const canvas = ref<InstanceType<typeof PlannerCanvas>>()
const state = ref<'loading' | 'ready' | 'missing'>('loading')
const name = ref('')

onMounted(async () => {
  const res = await HttpClient.get(ApiRoute.HOUSE_SHARE.VIEW(String(route.params.token))).catch(() => null)
  const body = res?.data?.data as { name: string; data: unknown } | undefined
  if (body && store.viewShared(body.data) !== null) {
    name.value = body.name
    store.preset = '3d'
    state.value = 'ready'
  } else {
    state.value = 'missing'
  }
})

// Puts the visitor's own draft back (it was never written over: nothing is saved while read-only).
onBeforeUnmount(() => store.leaveShared())
</script>

<template>
  <div class="shared">
    <header class="bar">
      <div class="who">
        <strong>{{ name || t('house.shared.title') }}</strong>
        <span class="muted">{{ t('house.shared.readOnly') }}</span>
      </div>
      <button type="button" class="bp-btn" @click="nav.redirectTo('/house')">{{ t('house.shared.openPlanner') }}</button>
    </header>

    <section class="stage">
      <template v-if="state === 'ready'">
        <PlannerCanvas ref="canvas" />
        <ViewPanel @fit="canvas?.fitPlan()" @zoom-sel="canvas?.zoomToSelection()" />
        <RoomLegend />
        <FurnitureMenu @locate="canvas?.zoomToSelection()" />
      </template>
      <div v-else class="msg">
        <p>{{ state === 'loading' ? t('house.shared.loading') : t('house.shared.missing') }}</p>
        <button v-if="state === 'missing'" type="button" class="bp-btn" @click="nav.redirectTo('/house')">{{ t('house.shared.openPlanner') }}</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.shared {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100dvh - 64px - var(--tabbar-h));
  min-height: 0;
  background: var(--color-background);
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
}
.who {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  min-width: 0;
}
.who strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.muted {
  font-size: 12px;
  color: var(--color-text-tertiary);
}
.stage {
  position: relative;
  flex: 1;
  min-height: 0;
}
.msg {
  height: 100%;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  color: var(--color-text-secondary);
}
.msg p {
  margin: 0;
}
</style>
