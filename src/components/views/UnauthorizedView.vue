<script lang="ts" setup>
import { useNav } from '@/hooks/useNav'
import { Lock } from '@element-plus/icons-vue'

const { redirectToLanding } = useNav()
const goToDashboard = () => {
  redirectToLanding()
}

</script>

<template>
  <div class="unauthorized-container">
    <div class="unauthorized-content">
      <el-icon class="error-icon" :size="80">
        <Lock />
      </el-icon>
      <h1>Access Denied</h1>
      <p class="description">
        You don't have permission to view this page.
      </p>
      <div class="action-buttons">
        <el-button type="primary" @click="goToDashboard">Go to Dashboard</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.unauthorized-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 20px;
}

.unauthorized-content {
  text-align: center;
  max-width: 500px;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.error-icon {
  color: #f56c6c;
  margin-bottom: 20px;
}

h1 {
  color: #f56c6c;
  margin-bottom: 16px;
  font-size: 28px;
}

.description {
  color: #606266;
  margin-bottom: 24px;
  line-height: 1.6;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}
</style>
