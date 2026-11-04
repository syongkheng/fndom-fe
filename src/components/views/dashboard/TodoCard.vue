<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useNav } from '@/hooks/useNav'
import { useTodoStore } from '@/stores/todo'
import { useAuthenticationStore } from '@/stores/authentication'
import SignInPrompt from './SignInPrompt.vue'

const { t } = useI18n()
const nav = useNav()
const store = useTodoStore()
const { isAuthenticated } = storeToRefs(useAuthenticationStore())

const load = () => {
  if (isAuthenticated.value) void store.fetchTasks()
  else store.reset()
}
onMounted(load)
watch(isAuthenticated, load)

// Pinned tasks come first in store.open, so this is the same top three the list leads with.
const top = computed(() => store.open.slice(0, 3))
const rest = computed(() => Math.max(0, store.open.length - top.value.length))
</script>

<template>
  <div class="todo-card bp-panel" role="button" tabindex="0" @click="nav.redirectTo('/todo')" @keyup.enter="nav.redirectTo('/todo')">
    <p class="bp-label card-title">{{ t('dashboard.todo.title') }}</p>

    <SignInPrompt v-if="!isAuthenticated" :message="t('dashboard.todo.signIn')" />
    <el-skeleton v-else-if="store.isLoading && !store.loaded" :rows="2" animated />
    <p v-else-if="!store.tasks.length" class="card-desc">{{ t('dashboard.todo.desc') }}</p>
    <p v-else-if="!top.length" class="card-desc">{{ t('dashboard.todo.empty') }}</p>

    <ul v-else class="todo-mini">
      <li v-for="task in top" :key="task.id" class="todo-mini-row" :class="{ pinned: task.pinned }">
        <span class="todo-mini-dot" aria-hidden="true" />
        <span class="todo-mini-text">{{ task.title }}</span>
      </li>
    </ul>

    <p v-if="rest" class="card-more">{{ t('dashboard.todo.more', { n: store.open.length }) }}</p>
    <span class="card-open">{{ t('dashboard.todo.open') }}</span>
  </div>
</template>

<style scoped>
.todo-card {
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

.todo-card:hover {
  border-color: var(--color-primary);
  background: var(--color-background-mute);
}

.card-title {
  margin: 0 0 10px;
}

.card-desc {
  font-size: 0.85rem;
  color: var(--color-text);
  margin: 0;
}

.todo-mini {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-mini-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.88rem;
  color: var(--color-heading);
}

.todo-mini-dot {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-border);
  border-radius: 50%;
}

.todo-mini-row.pinned .todo-mini-dot {
  border-color: var(--color-accent);
  background: var(--color-accent);
}

.todo-mini-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-more {
  margin: 8px 0 0;
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
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
