<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenVerification } from './hooks/useTokenVerification'
import { StorageUtils } from './utilities/StorageUtils'
import { startHeartbeat } from './utilities/HeartbeatUtils'
import { useAuthenticationStore } from './stores/authentication'
import { useAnalyticsStore } from './stores/analytics'

const { verifyToken, isVerifying } = useTokenVerification()

// Load the analytics dashboards this user can see (drives the "Analytics" nav link);
// clear them on logout so the next account doesn't inherit the list.
const analyticsStore = useAnalyticsStore()
const { isAuthenticated } = storeToRefs(useAuthenticationStore())
watch(
  isAuthenticated,
  (authed) => (authed ? analyticsStore.loadSystems(true) : analyticsStore.reset()),
  { immediate: false },
)

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
