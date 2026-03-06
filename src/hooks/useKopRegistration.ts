import { ref } from 'vue'

// Singleton ref — shared across all imports.
// TODO: replace with backend flag
const isRegistrationOpen = ref(false)

export function useKopRegistration() {
  return { isRegistrationOpen }
}
