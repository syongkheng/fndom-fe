import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useRequestLoadingStore = defineStore('requestLoading', () => {
  const activeRequests = ref(0)
  const isLoading = computed(() => activeRequests.value > 0)

  const increment = () => { activeRequests.value++ }
  const decrement = () => { if (activeRequests.value > 0) activeRequests.value-- }

  return { activeRequests, isLoading, increment, decrement }
})
