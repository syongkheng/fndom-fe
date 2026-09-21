<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import type { ToastItem } from '@/composables/useToast'

const props = defineProps<{ item: ToastItem }>()
const emit = defineEmits<{ dismiss: [] }>()

// The ring starts fully drawn and only gets its "drain to empty" class one
// frame after mount, so the CSS transition has an initial state to animate
// away from — setting both in the same tick means the browser paints the
// end state directly and nothing visibly moves.
const ringEmptying = ref(false)
onMounted(() => {
  nextTick(() => requestAnimationFrame(() => { ringEmptying.value = true }))
})

const runAction = async () => {
  await props.item.action?.onClick()
  emit('dismiss')
}
</script>

<template>
  <div class="app-toast" :class="`app-toast--${item.type}`" role="status">
    <div class="app-toast-icon-wrap">
      <svg v-if="item.ring" class="app-toast-ring" viewBox="0 0 40 40">
        <circle class="app-toast-ring-track" cx="20" cy="20" r="17" />
        <circle
          class="app-toast-ring-progress"
          :class="{ 'app-toast-ring-progress--empty': ringEmptying }"
          :style="{ transitionDuration: `${item.duration}ms` }"
          cx="20" cy="20" r="17"
        />
      </svg>
      <el-icon class="app-toast-icon"><component :is="item.icon" /></el-icon>
    </div>
    <span class="app-toast-text">{{ item.message }}</span>
    <button v-if="item.action" type="button" class="app-toast-action" @click="runAction">
      {{ item.action.label }}
    </button>
  </div>
</template>

<style scoped>
.app-toast {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px 12px 12px;
  border-radius: 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.12);
  max-width: calc(100vw - 32px);
  pointer-events: auto;
}

.app-toast-icon-wrap {
  position: relative;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-toast-icon {
  font-size: 1.1rem;
}

.app-toast--success .app-toast-icon { color: var(--el-color-success); }
.app-toast--error .app-toast-icon { color: var(--el-color-danger); }
.app-toast--info .app-toast-icon { color: var(--el-color-primary); }

.app-toast-ring {
  position: absolute;
  inset: -4px;
  width: calc(100% + 8px);
  height: calc(100% + 8px);
  transform: rotate(-90deg);
}

.app-toast-ring-track {
  fill: none;
  stroke: var(--color-border);
  stroke-width: 3;
}

.app-toast-ring-progress {
  fill: none;
  stroke: var(--el-color-primary);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 106.81;
  stroke-dashoffset: 0;
}

.app-toast-ring-progress--empty {
  stroke-dashoffset: 106.81;
  transition-property: stroke-dashoffset;
  transition-timing-function: linear;
}

.app-toast-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
}

.app-toast-action {
  border: none;
  background: none;
  color: var(--el-color-primary);
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
}

@media (max-width: 480px) {
  .app-toast-text {
    white-space: normal;
  }
}
</style>
