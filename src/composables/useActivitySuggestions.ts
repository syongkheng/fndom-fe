import { ref, watch, type Ref } from 'vue'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'

export interface ActivitySuggestion {
  id: number
  destination_tag: string
  title: string
  category: string | null
  estimated_hours: number | null
  description: string | null
  images_json: string | null // JSON-encoded string[]; parse with parseImages()
}

export function parseImages(imagesJson: string | null | undefined): string[] {
  if (!imagesJson) return []
  try {
    const parsed = JSON.parse(imagesJson)
    return Array.isArray(parsed) ? parsed.filter((i) => typeof i === 'string') : []
  } catch {
    return []
  }
}

// Fetch-on-destination-change logic shared between the (now map-only)
// Things-to-do exploration flow — previously lived inside
// ActivitySuggestionPanel.vue before its chip UI was replaced by map pins.
export function useActivitySuggestions(destination: Ref<string | undefined>) {
  const suggestions = ref<ActivitySuggestion[]>([])
  const loading = ref(false)

  const load = async () => {
    const dest = destination.value?.trim()
    if (!dest) { suggestions.value = []; return }
    loading.value = true
    try {
      const res = await HttpClient.get(ApiRoute.SUGGESTION.ACTIVITIES(dest))
      suggestions.value = res.data?.data ?? []
    } catch {
      suggestions.value = []
    } finally {
      loading.value = false
    }
  }

  watch(destination, load, { immediate: true })

  return { suggestions, loading }
}
