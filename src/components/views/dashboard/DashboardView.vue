<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Rank } from '@element-plus/icons-vue'
import RecentTransactionsCard from './RecentTransactionsCard.vue'
import TravelPlanningCard from './TravelPlanningCard.vue'
import BudgetCard from './BudgetCard.vue'
import LogSearchCard from './LogSearchCard.vue'
import AdminPanelCard from './AdminPanelCard.vue'
import { usePermission } from '@/composables/usePermission'

const { t } = useI18n()
const { hasRole } = usePermission()

type WidgetId = 'recentTransactions' | 'travelPlanning' | 'budget' | 'adminPanel' | 'logSearch'

const WIDGETS: Record<WidgetId, { component: unknown; requiresRole?: string }> = {
  recentTransactions: { component: markRaw(RecentTransactionsCard) },
  travelPlanning: { component: markRaw(TravelPlanningCard) },
  budget: { component: markRaw(BudgetCard) },
  adminPanel: { component: markRaw(AdminPanelCard), requiresRole: 'SYSTEM_R5' },
  logSearch: { component: markRaw(LogSearchCard), requiresRole: 'SYSTEM_R5' },
}
const DEFAULT_ORDER: WidgetId[] = ['recentTransactions', 'travelPlanning', 'budget', 'adminPanel', 'logSearch']
const DEFAULT_SPAN = 1
const MIN_SPAN = 1

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
  const spans = Object.fromEntries(DEFAULT_ORDER.map((id) => [id, DEFAULT_SPAN])) as Record<WidgetId, number>
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
  const style: Record<string, string> = { '--col-span': String(spans.value[id] ?? DEFAULT_SPAN) }
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
let resizeStartSpan = DEFAULT_SPAN
let resizeColumnStep = 1
let resizeMaxSpan = 1

function onResizeHandlePointerDown(id: WidgetId, e: PointerEvent) {
  e.preventDefault()
  const grid = gridEl()
  if (!grid) return
  sizingId.value = id
  resizeStartX = e.clientX
  resizeStartSpan = spans.value[id] ?? DEFAULT_SPAN
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
.dash-widgets {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 24px;
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
  border-radius: 6px;
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
