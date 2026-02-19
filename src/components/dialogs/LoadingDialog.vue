<script setup lang="ts">
import { ElIcon } from "element-plus";
import { Loading } from "@element-plus/icons-vue";
import { useLayoutStateStore } from "@/stores/layoutState";

const layoutStore = useLayoutStateStore();
</script>

<template>
  <el-dialog :model-value="layoutStore.loadingDialog.isVisible" align-center width="320px"
    style="background: #ffffff00; box-shadow: none;" :show-close="false" :close-on-click-modal="false"
    :close-on-press-escape="false" class="loading-dialog">
    <div class="loading-container">
      <ElIcon class="spinner" size="48">
        <Loading />
      </ElIcon>
    </div>
  </el-dialog>
</template>

<style scoped>
.loading-dialog :deep(.el-dialog__body) {
  padding: 2rem 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #ffffff80;
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
