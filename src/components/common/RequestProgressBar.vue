<script setup lang="ts">
import { useRequestLoadingStore } from '@/stores/requestLoading'
import { storeToRefs } from 'pinia'

const { isLoading } = storeToRefs(useRequestLoadingStore())
</script>

<template>
  <div class="progress-bar" :class="{ active: isLoading }">
    <div class="progress-shimmer" />
  </div>
</template>

<style scoped>
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 9999;
  opacity: 0;
  transition: opacity 0.2s ease;
  overflow: hidden;
  pointer-events: none;
}

.progress-bar.active {
  opacity: 1;
}

.progress-shimmer {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--el-color-primary) 0%,
    var(--el-color-primary-light-3) 40%,
    var(--el-color-primary-light-5) 50%,
    var(--el-color-primary-light-3) 60%,
    var(--el-color-primary) 100%
  );
  background-size: 300% 100%;
  animation: shimmer 1.4s linear infinite;
}

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
</style>
