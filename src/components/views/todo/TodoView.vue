<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import AppIcon from '@/components/common/AppIcon.vue'
import PageBackButton from '@/components/common/PageBackButton.vue'
import { useToast } from '@/composables/useToast'
import { MAX_PINNED, MAX_TITLE, useTodoStore } from '@/stores/todo'

const { t } = useI18n()
const toast = useToast()
const store = useTodoStore()
const { open, done, doneThisWeek, isLoading, loaded } = storeToRefs(store)

// Pick up changes made on another device: refresh on focus and every 15s while the tab is visible.
const SYNC_INTERVAL_MS = 15_000
let syncTimer: ReturnType<typeof setInterval> | undefined
const syncNow = () => {
  if (document.visibilityState === 'visible') void store.fetchTasks(true)
}
onMounted(() => {
  void store.fetchTasks()
  syncTimer = setInterval(syncNow, SYNC_INTERVAL_MS)
  document.addEventListener('visibilitychange', syncNow)
  window.addEventListener('focus', syncNow)
})
onBeforeUnmount(() => {
  clearInterval(syncTimer)
  document.removeEventListener('visibilitychange', syncNow)
  window.removeEventListener('focus', syncNow)
})

const UNDO_WINDOW_MS = 5000

const draft = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
const showDone = ref(false)

const addTask = () => {
  if (!store.add(draft.value)) return
  draft.value = ''
  inputEl.value?.focus()
}

// ─── inline edit ───
const editingId = ref<string | null>(null)
const editDraft = ref('')

const startEdit = async (id: string, title: string) => {
  editingId.value = id
  editDraft.value = title
  await nextTick()
  const el = document.querySelector<HTMLInputElement>('.todo-edit')
  el?.focus()
  el?.select()
}
const commitEdit = () => {
  if (editingId.value) store.rename(editingId.value, editDraft.value)
  editingId.value = null
}
const cancelEdit = () => {
  editingId.value = null
}

// ─── pin / delete ───
const togglePin = (id: string) => {
  if (!store.togglePin(id)) toast.error(t('todo.pinLimit', { n: MAX_PINNED }))
}

const removeTask = (id: string) => {
  const snapshot = store.remove(id)
  if (!snapshot) return
  toast.action(
    t('todo.deleted'),
    { label: t('todo.undo'), onClick: () => store.restore(snapshot) },
    { duration: UNDO_WINDOW_MS, ring: true },
  )
}

// ─── drag to reorder (Pointer Events, so it works with touch too) ───
const draggingId = ref<string | null>(null)

const onGripMove = (e: PointerEvent) => {
  if (!draggingId.value) return
  const row = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-task-id]')
  const overId = row?.dataset.taskId
  if (overId) store.move(draggingId.value, overId)
}
const stopDrag = () => {
  if (draggingId.value) {
    store.dragging = false
    void store.saveOrder()
  }
  draggingId.value = null
  window.removeEventListener('pointermove', onGripMove)
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
}
const startDrag = (e: PointerEvent, id: string) => {
  e.preventDefault()
  draggingId.value = id
  store.dragging = true
  window.addEventListener('pointermove', onGripMove)
  window.addEventListener('pointerup', stopDrag)
  window.addEventListener('pointercancel', stopDrag)
}
onBeforeUnmount(stopDrag)
</script>

<template>
  <div class="page-container todo-page">
    <header class="todo-header">
      <PageBackButton />
      <div>
        <p class="bp-label">{{ t('todo.eyebrow') }}</p>
        <h1 class="todo-title">{{ t('todo.title') }}</h1>
        <p class="todo-subtitle">{{ t('todo.subtitle') }}</p>
      </div>
    </header>

    <form class="todo-add" @submit.prevent="addTask">
      <input
        ref="inputEl"
        v-model="draft"
        class="todo-add-input"
        type="text"
        enterkeyhint="done"
        :maxlength="MAX_TITLE"
        :placeholder="t('todo.placeholder')"
        :aria-label="t('todo.placeholder')"
      />
      <button type="submit" class="todo-add-btn" :disabled="!draft.trim()" :aria-label="t('todo.add')">
        <AppIcon name="plus" size="22px" />
      </button>
    </form>

    <p v-if="open.length" class="todo-count">{{ t('todo.openCount', { n: open.length }) }}</p>

    <el-skeleton v-if="isLoading && !loaded" :rows="3" animated />

    <div v-else-if="!open.length" class="todo-empty bp-panel">
      <AppIcon name="check" size="28px" />
      <p class="todo-empty-title">{{ t('todo.emptyTitle') }}</p>
      <p class="todo-empty-desc">{{ t('todo.emptyDesc') }}</p>
    </div>

    <TransitionGroup v-else tag="ul" name="todo-flip" class="todo-list">
      <li
        v-for="task in open"
        :key="task.id"
        :data-task-id="task.id"
        class="todo-row"
        :class="{ pinned: task.pinned, dragging: draggingId === task.id }"
      >
        <button
          type="button"
          class="todo-grip"
          :aria-label="t('todo.drag')"
          :title="t('todo.drag')"
          @pointerdown="startDrag($event, task.id)"
        >
          <AppIcon name="grip" size="18px" />
        </button>

        <button type="button" class="todo-check" :aria-label="t('todo.check')" @click="store.toggle(task.id)" />

        <input
          v-if="editingId === task.id"
          v-model="editDraft"
          class="todo-edit"
          type="text"
          :maxlength="MAX_TITLE"
          :aria-label="t('todo.edit')"
          @keydown.enter.prevent="commitEdit"
          @keydown.esc.prevent="cancelEdit"
          @blur="commitEdit"
        />
        <span v-else class="todo-text" :title="t('todo.edit')" @click="startEdit(task.id, task.title)">{{ task.title }}</span>

        <button
          type="button"
          class="todo-icon-btn todo-pin"
          :class="{ on: task.pinned }"
          :aria-pressed="task.pinned"
          :aria-label="task.pinned ? t('todo.unpin') : t('todo.pin')"
          :title="task.pinned ? t('todo.unpin') : t('todo.pin')"
          @click="togglePin(task.id)"
        >
          <AppIcon name="star" size="20px" />
        </button>
        <button
          type="button"
          class="todo-icon-btn todo-del"
          :aria-label="t('todo.delete')"
          :title="t('todo.delete')"
          @click="removeTask(task.id)"
        >
          <AppIcon name="trash" size="20px" />
        </button>
      </li>
    </TransitionGroup>

    <section class="todo-done">
      <button type="button" class="todo-done-toggle" :aria-expanded="showDone" @click="showDone = !showDone">
        <AppIcon name="chevron" size="16px" class="chev" :class="{ expanded: showDone }" />
        {{ t('todo.doneWeek', { n: doneThisWeek }) }}
      </button>

      <template v-if="showDone">
        <p v-if="!done.length" class="todo-done-empty">{{ t('todo.doneEmpty') }}</p>
        <ul v-else class="todo-list">
          <li v-for="task in done" :key="task.id" class="todo-row is-done">
            <button type="button" class="todo-check checked" :aria-label="t('todo.uncheck')" @click="store.toggle(task.id)">
              <AppIcon name="check" size="14px" />
            </button>
            <span class="todo-text">{{ task.title }}</span>
            <button
              type="button"
              class="todo-icon-btn todo-del"
              :aria-label="t('todo.delete')"
              :title="t('todo.delete')"
              @click="removeTask(task.id)"
            >
              <AppIcon name="trash" size="20px" />
            </button>
          </li>
        </ul>
        <p v-if="done.length" class="todo-done-total">{{ t('todo.doneTotal', { n: done.length }) }}</p>
      </template>
    </section>
  </div>
</template>

<style scoped>
.todo-page {
  max-width: 640px;
  margin: 0 auto;
}

.todo-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}

.todo-title {
  margin: 8px 0 2px;
  font-size: 1.6rem;
  color: var(--color-heading);
}

.todo-subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
}

.todo-add {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.todo-add-input,
.todo-edit {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  min-height: 48px;
  padding: 0 16px;
  font: inherit;
  font-size: 16px; /* 16px stops iOS Safari zooming on focus */
  color: var(--color-heading);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  outline: none;
}

.todo-add-input:focus,
.todo-edit:focus {
  border-color: var(--color-primary);
}

.todo-add-btn {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  cursor: pointer;
  transition: transform 0.12s ease, opacity 0.12s;
}

.todo-add-btn:active:not(:disabled) {
  transform: scale(0.94);
}

.todo-add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.todo-count {
  margin: 0 0 8px 4px;
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
}

.todo-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 52px;
  padding: 4px 6px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-divider);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}

.todo-row.pinned {
  border-color: var(--color-accent);
}

.todo-row.dragging {
  opacity: 0.6;
  border-color: var(--color-primary);
}

.todo-grip,
.todo-icon-btn {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
}

.todo-grip {
  width: 28px;
  cursor: grab;
  touch-action: none; /* lets the pointer drag run instead of scrolling the page */
}

.todo-grip:active {
  cursor: grabbing;
}

.todo-icon-btn:hover {
  color: var(--color-primary);
}

.todo-del:hover {
  color: var(--color-danger);
}

.todo-pin.on {
  color: var(--color-accent);
}

.todo-pin.on :deep(.app-icon) {
  fill: currentColor;
}

.todo-check {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  margin: 0 6px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 2px solid var(--color-border);
  border-radius: 50%;
  background: transparent;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.todo-check:hover {
  border-color: var(--color-success);
}

.todo-check.checked {
  background: var(--color-success);
  border-color: var(--color-success);
}

.todo-text {
  flex: 1;
  min-width: 0;
  padding: 8px 4px;
  font-size: 1rem;
  line-height: 1.35;
  color: var(--color-heading);
  overflow-wrap: anywhere;
  cursor: text;
}

.todo-row.is-done .todo-text {
  color: var(--color-text-tertiary);
  text-decoration: line-through;
  cursor: default;
}

.todo-edit {
  min-height: 40px;
  padding: 0 12px;
  border-radius: 12px;
}

.todo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
  text-align: center;
  color: var(--color-success);
}

.todo-empty-title {
  margin: 8px 0 2px;
  font-weight: 700;
  color: var(--color-heading);
}

.todo-empty-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
}

.todo-done {
  margin-top: 24px;
}

.todo-done-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  padding: 6px 4px;
  border: none;
  background: none;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text);
  cursor: pointer;
}

.chev {
  transition: transform 0.15s ease;
}

.chev.expanded {
  transform: rotate(90deg);
}

.todo-done-empty,
.todo-done-total {
  margin: 4px 4px 0;
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
}

/* Rows slide into place on reorder, and fade out when checked off or deleted. */
.todo-flip-move,
.todo-flip-enter-active,
.todo-flip-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.todo-flip-enter-from,
.todo-flip-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.todo-flip-leave-active {
  position: absolute;
  width: 100%;
}

.todo-list {
  position: relative;
}
</style>
