import { computed } from 'vue'
import { useFeatureFlagStore } from '@/stores/featureFlags'

export function useKopRegistration() {
  const featureFlagStore = useFeatureFlagStore()
  const isRegistrationOpen = computed(() => featureFlagStore.isEnabled('kop_registration'))
  return { isRegistrationOpen }
}
