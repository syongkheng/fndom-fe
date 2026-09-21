import { ref, watch, type Ref } from 'vue'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'

export interface PlaceSuggestion {
  id?: number // present only for admin-curated rows (source === 'curated')
  name: string
  category: string
  lat: number
  lng: number
  description?: string
  images?: string[]
  source: 'curated' | 'overpass'
}

// Fetch-on-destination-change logic shared between the (now map-only)
// Places-to-visit exploration flow — previously lived inside
// PlaceSuggestionPanel.vue before its chip UI was replaced by map pins.
export function usePlaceSuggestions(destination: Ref<string | undefined>) {
  const suggestions = ref<PlaceSuggestion[]>([])
  const loading = ref(false)
  const failed = ref(false)

  const load = async () => {
    const dest = destination.value?.trim()
    if (!dest) { suggestions.value = []; failed.value = false; return }
    loading.value = true
    failed.value = false
    try {
      const res = await HttpClient.get(ApiRoute.PLACES.NEARBY(dest))
      suggestions.value = res.data?.data ?? []
    } catch {
      suggestions.value = []
      failed.value = true
    } finally {
      loading.value = false
    }
  }

  watch(destination, load, { immediate: true })

  return { suggestions, loading, failed }
}
