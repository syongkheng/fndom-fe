<script setup lang="ts">
import { defineProps } from "vue";
import { ElIcon } from "element-plus";
import { Loading } from "@element-plus/icons-vue";

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  loadingText: {
    type: String,
    required: false,
    default: "Loading...",
  },
});
</script>

<template>
  <el-dialog :model-value="isOpen" align-center width="320px" :show-close="false" :close-on-click-modal="false"
    :close-on-press-escape="false" class="loading-dialog">
    <div class="loading-container">
      <ElIcon class="spinner" size="48">
        <Loading />
      </ElIcon>
      <p class="loading-text">{{ loadingText }}</p>
    </div>
  </el-dialog>
</template>

<style scoped>
.loading-dialog :deep(.el-dialog__body) {
  padding: 2rem 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.spinner {
  color: var(--el-color-primary);
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 1.1rem;
  font-weight: 500;
  color: #333;
  text-align: center;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
