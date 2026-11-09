<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNav } from '@/hooks/useNav'
import { useHousePlanStore } from '@/stores/housePlan'
import { activePlan as plan } from '@/constants/houseplan/floorplan'
import { isQuarterTurn, planSize } from '@/utilities/houseGeometry'

const { t } = useI18n()
const nav = useNav()
// The store reads the saved layout from localStorage on creation — no three.js is loaded here.
const store = useHousePlanStore()

const count = computed(() => store.items.length)

const PAD = 0.4
const viewBox = `${-PAD} ${-PAD} ${plan.width + PAD * 2} ${plan.depth + PAD * 2}`
const outlinePath = `M${plan.outline.map((p) => p.join(' ')).join('L')}Z`
const wallLines = plan.walls.filter((w) => w.kind !== 'door')

// Placed furniture as footprints (a freely turned piece is drawn rotated about its centre).
const rects = computed(() =>
  store.items.map((it) => {
    const { x: w, y: d } = planSize(it)
    const free = !isQuarterTurn(it.rot)
    return {
      uid: it.uid,
      x: free ? it.x - it.w / 2 : it.x - w / 2,
      y: free ? it.y - it.d / 2 : it.y - d / 2,
      w: free ? it.w : w,
      d: free ? it.d : d,
      transform: free ? `rotate(${it.rot} ${it.x} ${it.y})` : undefined,
      bad: store.conflicts.has(it.uid),
    }
  }),
)
</script>

<template>
  <div class="plan-card bp-panel" role="button" tabindex="0" @click="nav.redirectTo('/house')" @keyup.enter="nav.redirectTo('/house')">
    <p class="bp-label card-title">{{ t('dashboard.housePlan.title') }}</p>

    <svg :viewBox="viewBox" class="thumb" aria-hidden="true">
      <path :d="outlinePath" class="slab" />
      <rect v-for="r in rects" :key="r.uid" :x="r.x" :y="r.y" :width="r.w" :height="r.d" :transform="r.transform" class="piece" :class="{ bad: r.bad }" />
      <line v-for="(w, i) in wallLines" :key="i" :x1="w.x1" :y1="w.y1" :x2="w.x2" :y2="w.y2" class="wall" />
    </svg>

    <p class="card-desc">
      {{ count ? t('dashboard.housePlan.descItems', { n: count }, count) : t('dashboard.housePlan.descEmpty') }}
    </p>
    <p v-if="store.conflicts.size" class="card-warn">{{ t('dashboard.housePlan.overlaps', { n: store.conflicts.size }) }}</p>
    <span class="card-open">{{ t('dashboard.housePlan.open') }}</span>
  </div>
</template>

<style scoped>
.plan-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.plan-card:hover {
  border-color: var(--color-primary);
  background: var(--color-background-mute);
}
.card-title {
  margin: 0 0 10px;
}
.thumb {
  width: 100%;
  height: auto;
  max-height: 150px;
  margin-bottom: 10px;
}
.slab {
  fill: var(--color-background-mute);
  stroke: none;
}
.wall {
  stroke: var(--color-primary);
  stroke-width: 0.15;
  stroke-linecap: square;
}
.piece {
  fill: var(--color-accent);
  fill-opacity: 0.35;
  stroke: var(--color-accent);
  stroke-width: 0.05;
}
.piece.bad {
  fill: var(--color-danger);
  fill-opacity: 0.45;
  stroke: var(--color-danger);
}
.card-desc {
  font-size: 0.85rem;
  color: var(--color-text);
  margin: 0;
}
.card-warn {
  margin: 6px 0 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-danger);
}
.card-open {
  align-self: flex-start;
  margin-top: auto;
  padding-top: 12px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--color-primary);
}
</style>
