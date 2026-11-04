<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useTokenVerification } from './hooks/useTokenVerification'
import { StorageUtils } from './utilities/StorageUtils'
import { startHeartbeat } from './utilities/HeartbeatUtils'

const { verifyToken, isVerifying } = useTokenVerification()

let stopHeartbeat: (() => void) | null = null

onMounted(async () => {
  const visitorSessionId = StorageUtils.getVisitorSessionId()
  await verifyToken()
  stopHeartbeat = startHeartbeat(visitorSessionId)
})

onUnmounted(() => {
  stopHeartbeat?.()
})
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
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
}

.loading-spinner {
  border: 2px solid var(--color-border);
  border-left-color: var(--color-primary);
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
