<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import Toast from './Toast.vue'

const { toasts, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <TransitionGroup tag="div" name="app-toast-stack" class="app-toast-stack">
      <Toast v-for="item in toasts" :key="item.id" :item="item" @dismiss="dismiss(item.id)" />
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.app-toast-stack {
  position: fixed;
  /* Sits below TopNavigation's 80px sticky header — independent of ElMessage,
     which is anchored from the bottom via App.vue's el-config-provider. */
  top: 96px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.app-toast-stack-move,
.app-toast-stack-enter-active,
.app-toast-stack-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.app-toast-stack-enter-from,
.app-toast-stack-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

.app-toast-stack-leave-active {
  position: absolute;
}

@media (max-width: 480px) {
  .app-toast-stack {
    left: 16px;
    right: 16px;
    transform: none;
    align-items: stretch;
  }
}
</style>
