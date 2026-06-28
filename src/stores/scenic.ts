import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { i18n } from '@/i18n'
const t = (key: string) => i18n.global.t(key)
import { useAuthenticationStore } from '@/stores/authentication'
import { ApiRoute } from '@/constants/ApiRoute'
import { StorageUtils, StorageKey } from '@/utilities/StorageUtils'
import HttpClient from '@/interceptors/HttpClient'

export interface ScenicSpot {
  id: number
  nameZh: string
  nameEn: string
  province: string
  city: string
  provinceEn: string
  cityEn: string
  sortOrder: number
}

export const useScenicStore = defineStore('scenic', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const spots = ref<ScenicSpot[]>([])
  const checkedIds = ref<Set<number>>(new Set())
  const loading = ref(false)
  const initialized = ref(false)

  // ── Computed ───────────────────────────────────────────────────────────────
  const visitedCount = computed(() => checkedIds.value.size)
  const totalCount = computed(() => spots.value.length)

  const spotsByProvince = computed(() => {
    const map: Record<string, ScenicSpot[]> = {}
    for (const spot of spots.value) {
      const key = spot.provinceEn
      if (!map[key]) map[key] = []
      map[key].push(spot)
    }
    return map
  })

  // ── Init ───────────────────────────────────────────────────────────────────
  const init = async () => {
    if (initialized.value) return
    loading.value = true
    try {
      const res = await HttpClient.get(ApiRoute.SCENIC.GET_ALL)
      spots.value = res.data.data.spots as ScenicSpot[]

      const authStore = useAuthenticationStore()
      if (authStore.isAuthenticated) {
        const checkRes = await HttpClient.get(ApiRoute.SCENIC.GET_CHECKLIST)
        const serverChecks = checkRes.data.data.checklist as { scenicId: number; visited: boolean }[]
        checkedIds.value = new Set(serverChecks.filter(c => c.visited).map(c => c.scenicId))
      } else {
        const stored = StorageUtils.get<number[]>(StorageKey.SCENIC_CHECKLIST) ?? []
        checkedIds.value = new Set(stored)
      }

      initialized.value = true
    } catch {
      ElMessage.error(t('toast.scenicLoadFailed'))
    } finally {
      loading.value = false
    }
  }

  // ── Toggle ─────────────────────────────────────────────────────────────────
  const toggleVisited = async (scenicId: number) => {
    const newState = !checkedIds.value.has(scenicId)

    // Optimistic update
    if (newState) checkedIds.value.add(scenicId)
    else checkedIds.value.delete(scenicId)

    const authStore = useAuthenticationStore()
    if (authStore.isAuthenticated) {
      try {
        await HttpClient.post(ApiRoute.SCENIC.UPSERT_CHECKLIST, { scenicId, visited: newState })
      } catch {
        // Rollback on failure
        if (newState) checkedIds.value.delete(scenicId)
        else checkedIds.value.add(scenicId)
        ElMessage.error(t('toast.scenicSaveFailed'))
      }
    } else {
      StorageUtils.set(StorageKey.SCENIC_CHECKLIST, [...checkedIds.value])
    }
  }

  const isVisited = (scenicId: number) => checkedIds.value.has(scenicId)

  return {
    spots,
    checkedIds,
    loading,
    initialized,
    visitedCount,
    totalCount,
    spotsByProvince,
    init,
    toggleVisited,
    isVisited,
  }
})
