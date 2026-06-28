import { onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Analytics } from '@/analytics/events'

export function usePageTracking() {
  const router = useRouter()
  const stop = router.afterEach((to) => {
    Analytics.pageView(to.path, String(to.name ?? to.path))
  })
  onUnmounted(stop)
}
