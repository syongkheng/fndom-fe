<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { computed, markRaw, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Rank } from '@element-plus/icons-vue'
import RecentTransactionsCard from './RecentTransactionsCard.vue'
import HousePlanCard from './HousePlanCard.vue'
import BudgetCard from './BudgetCard.vue'
import TodoCard from './TodoCard.vue'
import ItineraryCard from './ItineraryCard.vue'
import LogSearchCard from './LogSearchCard.vue'
import AdminPanelCard from './AdminPanelCard.vue'
import { usePermission } from '@/composables/usePermission'
import { useNav } from '@/hooks/useNav'

const { t, locale } = useI18n()
const { hasRole } = usePermission()
const nav = useNav()

// Workbench panels. Stale ids in localStorage (e.g. the old 'travelPlanning' or
// 'recentTransactions') are filtered out by loadOrder, and any new id is appended.
type WidgetId = 'transactions' | 'todo' | 'budget' | 'housePlan' | 'itinerary' | 'adminPanel' | 'logSearch'

const WIDGETS: Record<WidgetId, { component: unknown; requiresRole?: string; span: number }> = {
  transactions: { component: markRaw(RecentTransactionsCard), span: 2 },
  todo: { component: markRaw(TodoCard), span: 2 },
  budget: { component: markRaw(BudgetCard), span: 2 },
  housePlan: { component: markRaw(HousePlanCard), span: 2 },
  itinerary: { component: markRaw(ItineraryCard), span: 2 },
  adminPanel: { component: markRaw(AdminPanelCard), requiresRole: 'SYSTEM_R5', span: 1 },
  logSearch: { component: markRaw(LogSearchCard), requiresRole: 'SYSTEM_R5', span: 1 },
}
const DEFAULT_ORDER: WidgetId[] = ['transactions', 'todo', 'budget', 'housePlan', 'itinerary', 'adminPanel', 'logSearch']
const MIN_SPAN = 1

const today = computed(() =>
  new Date().toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : 'en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }),
)

const greeting = computed(() => {
  const h = new Date().getHours()
  return t(h < 12 ? 'dashboard.workbench.greetMorning' : h < 18 ? 'dashboard.workbench.greetAfternoon' : 'dashboard.workbench.greetEvening')
})

// One tip per day, rotating — a small reason to come back and poke around.
const TIP_COUNT = 5
const tip = computed(() => {
  const day = Math.floor(Date.now() / 86_400_000)
  return t(`dashboard.workbench.tip${(day % TIP_COUNT) + 1}`)
})

const TILES = [
  { key: 'house', icon: 'home', path: '/house', tint: '#E8452C' },
  { key: 'budget', icon: 'wallet', path: '/budget', tint: '#F2A81D' },
  { key: 'trips', icon: 'suitcase', path: '/travel/trips', tint: '#2E9E8F' },
  { key: 'pay', icon: 'card', path: '/apple-pay', tint: '#7A5AF8' },
] as const

// "Surprise me" drops people into a random module — nudges exploring.
const surprise = () => {
  const pick = TILES[Math.floor(Math.random() * 3)]
  nav.redirectTo(pick.path)
}

// Storage keys keep the legacy 'fndom' prefix so saved layouts survive the Awense rebrand.
const ORDER_STORAGE_KEY = 'fndom-dashboard-widget-order'
const SIZE_STORAGE_KEY = 'fndom-dashboard-widget-sizes'

function loadOrder(): WidgetId[] {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY)
    if (!raw) return [...DEFAULT_ORDER]
    const stored = (JSON.parse(raw) as string[]).filter((id): id is WidgetId => id in WIDGETS)
    const missing = DEFAULT_ORDER.filter((id) => !stored.includes(id))
    return [...stored, ...missing]
  } catch {
    return [...DEFAULT_ORDER]
  }
}

function loadSpans(): Record<WidgetId, number> {
  const spans = Object.fromEntries(DEFAULT_ORDER.map((id) => [id, WIDGETS[id].span])) as Record<WidgetId, number>
  try {
    const raw = localStorage.getItem(SIZE_STORAGE_KEY)
    if (!raw) return spans
    const stored = JSON.parse(raw) as Partial<Record<WidgetId, number>>
    for (const id of DEFAULT_ORDER) {
      const v = stored[id]
      if (typeof v === 'number' && v >= MIN_SPAN) spans[id] = v
    }
  } catch {
    // fall through with defaults
  }
  return spans
}

const order = ref<WidgetId[]>(loadOrder())
const spans = ref<Record<WidgetId, number>>(loadSpans())

const visibleWidgets = computed(() =>
  order.value.filter((id) => {
    const role = WIDGETS[id].requiresRole
    return !role || hasRole(role)
  }),
)

function persistOrder() {
  try {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order.value))
  } catch {
    // localStorage unavailable — order just won't persist across reloads
  }
}

function persistSpans() {
  try {
    localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(spans.value))
  } catch {
    // localStorage unavailable — sizes just won't persist across reloads
  }
}

function gridEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.dash-widgets')
}

function currentColumnCount(grid: HTMLElement): number {
  return getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1
}

function slotStyle(id: WidgetId): Record<string, string> {
  const style: Record<string, string> = { '--col-span': String(spans.value[id] ?? WIDGETS[id].span) }
  if (draggingId.value === id || releasingId.value === id) {
    style.transform = `translate(${dragDelta.value.x}px, ${dragDelta.value.y}px)`
  }
  return style
}

// ── Drag to reorder ───────────────────────────────────────────────────────
// Pointer Events (not native HTML5 drag-and-drop) so the same handler works
// for mouse and touch. Only the small grip handle initiates a drag — the
// card body underneath keeps its own click-to-navigate behavior untouched,
// since the handle is a sibling element, not a descendant of the card.
const draggingId = ref<WidgetId | null>(null)
const releasingId = ref<WidgetId | null>(null)
const dragDelta = ref({ x: 0, y: 0 })
let dragAnchor = { x: 0, y: 0 }

const transitionName = computed(() => (draggingId.value ? '' : 'dash-widget'))

function onHandlePointerDown(id: WidgetId, e: PointerEvent) {
  e.preventDefault()
  draggingId.value = id
  releasingId.value = null
  dragAnchor = { x: e.clientX, y: e.clientY }
  dragDelta.value = { x: 0, y: 0 }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp, { once: true })
}

function onPointerMove(e: PointerEvent) {
  if (!draggingId.value) return
  dragDelta.value = { x: e.clientX - dragAnchor.x, y: e.clientY - dragAnchor.y }

  const target = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)
    ?.closest<HTMLElement>('.dash-widget-slot')
  const targetId = target?.dataset.widgetId as WidgetId | undefined
  if (!targetId || targetId === draggingId.value) return

  const from = order.value.indexOf(draggingId.value)
  const to = order.value.indexOf(targetId)
  if (from === -1 || to === -1) return

  const next = [...order.value]
  next.splice(from, 1)
  next.splice(to, 0, draggingId.value)
  order.value = next
  // The dragged slot just jumped to a new spot in the flow — re-anchor to
  // the pointer's current position so its offset doesn't visually jump.
  dragAnchor = { x: e.clientX, y: e.clientY }
  dragDelta.value = { x: 0, y: 0 }
}

function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove)
  if (!draggingId.value) return
  releasingId.value = draggingId.value
  draggingId.value = null
  requestAnimationFrame(() => {
    dragDelta.value = { x: 0, y: 0 }
    setTimeout(() => {
      releasingId.value = null
      persistOrder()
    }, 220)
  })
}

// ── Drag to resize ────────────────────────────────────────────────────────
// A second, separate handle (bottom-right corner) drives column-span
// resizing — distinct from the move handle above so the two gestures never
// fight over the same pointerdown. Resizing snaps in whole-column steps
// (not free-form px) since the grid column width is measured once at drag
// start and the live span is just startSpan + round(dx / columnStep).
const sizingId = ref<WidgetId | null>(null)
let resizeStartX = 0
let resizeStartSpan = 1
let resizeColumnStep = 1
let resizeMaxSpan = 1

function onResizeHandlePointerDown(id: WidgetId, e: PointerEvent) {
  e.preventDefault()
  const grid = gridEl()
  if (!grid) return
  sizingId.value = id
  resizeStartX = e.clientX
  resizeStartSpan = spans.value[id] ?? WIDGETS[id].span
  resizeMaxSpan = currentColumnCount(grid)

  const rect = grid.getBoundingClientRect()
  const gapPx = parseFloat(getComputedStyle(grid).columnGap || '0') || 0
  resizeColumnStep = (rect.width - gapPx * (resizeMaxSpan - 1)) / resizeMaxSpan + gapPx

  window.addEventListener('pointermove', onResizePointerMove)
  window.addEventListener('pointerup', onResizePointerUp, { once: true })
}

function onResizePointerMove(e: PointerEvent) {
  if (!sizingId.value) return
  const steps = Math.round((e.clientX - resizeStartX) / resizeColumnStep)
  const next = Math.min(resizeMaxSpan, Math.max(MIN_SPAN, resizeStartSpan + steps))
  if (spans.value[sizingId.value] !== next) {
    spans.value = { ...spans.value, [sizingId.value]: next }
  }
}

function onResizePointerUp() {
  window.removeEventListener('pointermove', onResizePointerMove)
  sizingId.value = null
  persistSpans()
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointermove', onResizePointerMove)
})
</script>

<template>
  <div class="page-container">
    <section class="hero">
      <div class="hero-text">
        <span class="hero-date">{{ today }}</span>
        <h1 class="hero-title">{{ greeting }}</h1>
        <p class="hero-sub">{{ t('dashboard.workbench.sub') }}</p>
        <p class="hero-tip"><span class="hero-tip-tag">{{ t('dashboard.workbench.tipLabel') }}</span> {{ tip }}</p>
      </div>
      <div class="hero-art" aria-hidden="true"><AppIcon name="lantern" size="1em" /></div>
    </section>

    <div class="tiles">
      <button
        v-for="tile in TILES"
        :key="tile.key"
        type="button"
        class="tile"
        :style="{ '--tint': tile.tint }"
        @click="nav.redirectTo(tile.path)"
      >
        <span class="tile-icon" aria-hidden="true"><AppIcon :name="tile.icon" size="1.5rem" /></span>
        <span class="tile-title">{{ t(`dashboard.workbench.tiles.${tile.key}.title`) }}</span>
        <span class="tile-desc">{{ t(`dashboard.workbench.tiles.${tile.key}.desc`) }}</span>
      </button>
      <button type="button" class="tile tile--surprise" @click="surprise">
        <span class="tile-icon" aria-hidden="true"><AppIcon name="dice" size="1.5rem" /></span>
        <span class="tile-title">{{ t('dashboard.workbench.surprise.title') }}</span>
        <span class="tile-desc">{{ t('dashboard.workbench.surprise.desc') }}</span>
      </button>
    </div>

    <h2 class="section-title">{{ t('dashboard.workbench.panels') }}</h2>

    <TransitionGroup tag="div" class="dash-widgets" :name="transitionName">
      <div
        v-for="id in visibleWidgets"
        :key="id"
        class="dash-widget-slot"
        :class="{
          'dash-widget-slot--dragging': draggingId === id,
          'dash-widget-slot--resizing': sizingId === id,
        }"
        :data-widget-id="id"
        :style="slotStyle(id)"
      >
        <button
          type="button"
          class="drag-handle"
          :title="t('dashboard.dragHandle')"
          :aria-label="t('dashboard.dragHandle')"
          @pointerdown="onHandlePointerDown(id, $event)"
        >
          <el-icon><Rank /></el-icon>
        </button>
        <component :is="WIDGETS[id].component" class="dash-widget" />
        <button
          type="button"
          class="resize-handle"
          :title="t('dashboard.resizeHandle')"
          :aria-label="t('dashboard.resizeHandle')"
          @pointerdown="onResizeHandlePointerDown(id, $event)"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M9 1 1 9M9 5 5 9M9 9h0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 20px;
  padding: 28px 30px;
  border-radius: 28px;
  color: #fff;
  background: linear-gradient(125deg, #e8452c 0%, #f06a35 55%, #f2a81d 120%);
  box-shadow: 0 14px 34px rgba(232, 69, 44, 0.28);
  overflow: hidden;
}

/* soft bokeh circles */
.hero::before,
.hero::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  pointer-events: none;
}
.hero::before {
  width: 220px;
  height: 220px;
  right: -50px;
  top: -90px;
}
.hero::after {
  width: 120px;
  height: 120px;
  right: 130px;
  bottom: -60px;
}

.hero-text {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.hero-date {
  align-self: flex-start;
  padding: 2px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  font-size: 0.78rem;
  font-weight: 700;
}

.hero-title {
  margin: 0;
  color: #fff;
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1.2;
}

.hero-sub {
  margin: 0;
  font-size: 0.98rem;
  opacity: 0.92;
}

.hero-tip {
  margin: 10px 0 0;
  padding: 8px 12px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.16);
  font-size: 0.85rem;
  line-height: 1.45;
}

.hero-tip-tag {
  display: inline-block;
  margin-right: 6px;
  padding: 0 8px;
  border-radius: 999px;
  background: #ffd36b;
  color: #5a2a00;
  font-size: 0.72rem;
  font-weight: 800;
}

.hero-art {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  font-size: 4.6rem;
  line-height: 1;
  filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.25));
  transform-origin: 50% 0;
  animation: sway 3.6s ease-in-out infinite;
}

@keyframes sway {
  0%, 100% { transform: rotate(-6deg); }
  50% { transform: rotate(6deg); }
}

.tiles {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 16px;
  text-align: left;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-background-soft);
  border: 1px solid var(--color-divider);
  border-radius: 22px;
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.tile:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-pop);
}

.tile:active {
  transform: scale(0.97);
}

.tile-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin-bottom: 6px;
  border-radius: 16px;
  font-size: 1.5rem;
  color: var(--tint, var(--color-primary));
  background: color-mix(in srgb, var(--tint, var(--color-primary)) 16%, transparent);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tile:hover .tile-icon {
  transform: rotate(-8deg) scale(1.12);
}

.tile-title {
  font-size: 0.98rem;
  font-weight: 800;
  color: var(--color-heading);
}

.tile-desc {
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--color-text-secondary);
}

.tile--surprise .tile-icon {
  color: var(--color-primary);
}

.tile--surprise {
  border-style: dashed;
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.section-title {
  margin: 30px 0 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--color-heading);
}

@media (max-width: 900px) {
  .tiles {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .hero {
    padding: 22px 20px;
    border-radius: 24px;
  }
  .hero-title {
    font-size: 1.5rem;
  }
  .hero-art {
    font-size: 3.2rem;
  }
  .tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .tile {
    padding: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-art {
    animation: none;
  }
}

.dash-widgets {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 12px;
  align-items: stretch;
}

@media (max-width: 900px) {
  .dash-widgets {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 500px) {
  .dash-widgets {
    grid-template-columns: minmax(0, 1fr);
  }

  /* one column: a wider span would create an implicit second column */
  .dash-widget-slot {
    grid-column: span 1;
  }
}

.dash-widget {
  margin-top: 0;
}

.dash-widget-slot {
  position: relative;
  grid-column: span var(--col-span, 1);
  transition: transform 0.2s ease;
}

.dash-widget-slot--dragging {
  z-index: 10;
  transition: none;
  cursor: grabbing;
}

.dash-widget-slot--resizing {
  z-index: 10;
}

.dash-widget-move {
  transition: transform 0.2s ease;
}

.drag-handle,
.resize-handle {
  position: absolute;
  z-index: 2;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: var(--color-background-mute);
  color: var(--color-text);
  opacity: 0.35;
  touch-action: none;
  transition: opacity 0.12s;
}

.drag-handle:hover,
.resize-handle:hover {
  opacity: 0.9;
}

.drag-handle {
  top: 6px;
  right: 6px;
  cursor: grab;
}

.dash-widget-slot--dragging .drag-handle {
  opacity: 0.9;
  cursor: grabbing;
}

.resize-handle {
  bottom: 6px;
  right: 6px;
  cursor: nwse-resize;
}

.dash-widget-slot--resizing .resize-handle {
  opacity: 0.9;
}
</style>
