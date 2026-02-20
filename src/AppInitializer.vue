<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useTokenVerification } from './hooks/useTokenVerification'

// import { StorageUtils } from './utilities/StorageUtils'
// import { startHeartbeat } from './utilities/HeartbeatUtils'

const { verifyToken, isVerifying } = useTokenVerification()

// let stopHeartbeat: (() => void) | null = null

onMounted(async () => {
  // const visitorSessionId = StorageUtils.getVisitorSessionId()

  await verifyToken()

  // stopHeartbeat = startHeartbeat(visitorSessionId)
})

// onUnmounted(() => {
//   stopHeartbeat?.()
// })
</script>

<template>
  <div v-if="isVerifying" class="app-initializing">
    <div class="loading-spinner"></div>
    <p>Verifying session...</p>
  </div>

  <slot v-else />
</template>

<style scoped>
.app-initializing {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #42b983;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
