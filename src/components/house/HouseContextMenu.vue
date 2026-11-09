<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHousePlanStore } from '@/stores/housePlan'

const props = defineProps<{
  /** screen position of the click, the piece under it (null = empty floor) and the plan point */
  menu: { x: number; y: number; uid: string | null; at: [number, number] | null }
}>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const store = useHousePlanStore()
const el = ref<HTMLElement>()
const pos = ref({ left: props.menu.x, top: props.menu.y })

const piece = computed(() => store.items.find((i) => i.uid === props.menu.uid) ?? null)

type Action = { key: string; label: string; run: () => void; disabled?: boolean; danger?: boolean }
const actions = computed<Action[]>(() => {
  const it = piece.value
  if (!it) {
    return store.clipboard ? [{ key: 'paste', label: t('house.menu.paste'), run: () => store.paste(props.menu.at) }] : []
  }
  return [
    { key: 'edit', label: t('house.menu.edit'), run: () => store.openBuilder(true) },
    { key: 'rotate', label: t('house.menu.rotate'), run: () => store.rotateSelected(), disabled: !!it.locked },
    { key: 'duplicate', label: t('house.menu.duplicate'), run: () => store.duplicateSelected() },
    { key: 'copy', label: t('house.menu.copy'), run: () => store.copySelected() },
    { key: 'cut', label: t('house.menu.cut'), run: () => store.cutSelected() },
    { key: 'lock', label: it.locked ? t('house.menu.unlock') : t('house.menu.lock'), run: () => store.toggleLock(it.uid) },
    { key: 'delete', label: t('house.menu.delete'), run: () => store.deleteSelected(), danger: true },
  ]
})

function choose(a: Action) {
  if (a.disabled) return
  a.run()
  emit('close')
}

// Closes on any press outside, Escape, scroll or resize.
function onOutside(e: Event) {
  if (!el.value?.contains(e.target as Node)) emit('close')
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('close')
  }
}

onMounted(async () => {
  window.addEventListener('pointerdown', onOutside, true)
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('wheel', onOutside, { capture: true, passive: true })
  window.addEventListener('resize', () => emit('close'))
  if (!actions.value.length) emit('close')
  await nextTick()
  // keep the menu on screen
  const r = el.value?.getBoundingClientRect()
  if (r) {
    pos.value = {
      left: Math.max(4, Math.min(props.menu.x, window.innerWidth - r.width - 4)),
      top: Math.max(4, Math.min(props.menu.y, window.innerHeight - r.height - 4)),
    }
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onOutside, true)
  window.removeEventListener('keydown', onKey, true)
  window.removeEventListener('wheel', onOutside, true)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="actions.length" ref="el" class="ctx" role="menu" :style="{ left: pos.left + 'px', top: pos.top + 'px' }" @contextmenu.prevent>
      <button
        v-for="a in actions"
        :key="a.key"
        type="button"
        role="menuitem"
        class="item"
        :class="{ danger: a.danger }"
        :disabled="a.disabled"
        @click="choose(a)"
      >
        {{ a.label }}
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.ctx {
  position: fixed;
  z-index: 3000;
  min-width: 168px;
  padding: 6px;
  border-radius: 12px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  box-shadow: 0 10px 30px rgb(0 0 0 / 22%);
  display: flex;
  flex-direction: column;
}
.item {
  text-align: left;
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--color-heading);
  font: 600 13px/1.2 var(--font-sans);
  cursor: pointer;
}
.item:hover:not(:disabled) {
  background: var(--color-background-mute);
}
.item:disabled {
  opacity: 0.4;
  cursor: default;
}
.item.danger {
  color: var(--color-danger);
}
</style>
