<script setup lang="ts">
import { useAuthenticationStore } from "@/stores/authentication";
import { useLayoutStateStore } from "@/stores/layoutState";
import { ElMessageBox } from "element-plus";
import { storeToRefs } from "pinia";

const layoutStore = useLayoutStateStore();

const authStore = useAuthenticationStore()
const { isAuthenticated } = storeToRefs(authStore) // Preserves reactivity

const handleLoginRedirect = () => {
  layoutStore.travelPlanningInitialDialog.setFalse();
  layoutStore.loginDialog.setTrue();
}

const handleBeforeClose = (done: () => void) => {
  ElMessageBox.confirm(
    'Are you sure you want to continue without logging in? Your travel plans may not be saved.',
    'Confirm',
    {
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
      type: 'warning',
    }
  )
    .then(() => {
      layoutStore.travelPlanningInitialDialog.setFalse();
      done();
    })
    .catch(() => {
      // Do nothing, user cancelled
    });
}

</script>

<template>
  <el-dialog :model-value="layoutStore.travelPlanningInitialDialog.isVisible && !isAuthenticated" width="320px"
    :show-close="true" :close-on-click-modal="false" :close-on-press-escape="false" class="advisory-dialog"
    :before-close="handleBeforeClose">
    <div class="advisory-container">
      <h2>Login Recommended</h2>
      <p>
        To make sure your plans are saved and accessible anytime,
        please log in before you continue.
      </p>
      <el-button type="primary" @click="handleLoginRedirect">
        Login Now
      </el-button>
    </div>
  </el-dialog>
</template>

<style scoped>
.advisory-dialog :deep(.el-dialog__body) {
  padding: 2rem 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #ffffff80;
}

.advisory-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
