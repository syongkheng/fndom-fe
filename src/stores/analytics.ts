import { defineStore } from 'pinia'
import { ref } from 'vue'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import type {
  AnalyticsGrant,
  AnalyticsSummary,
  AnalyticsSystem,
  AnalyticsSystemAdmin,
} from '@/interfaces/analytics.model'

/**
 * Analytics dashboards the signed-in user may view. SYSTEM_R5 sees every active system;
 * anyone else sees only systems they've been granted (tb_aa_resource_access).
 */
export const useAnalyticsStore = defineStore('analytics', () => {
  const systems = ref<AnalyticsSystem[]>([])
  const loaded = ref(false)
  let inflight: Promise<void> | null = null

  async function loadSystems(force = false): Promise<void> {
    if (loaded.value && !force) return
    if (inflight) return inflight
    inflight = HttpClient.get(ApiRoute.ANALYTICS.SYSTEMS)
      .then((res) => {
        systems.value = res.data.data ?? []
        loaded.value = true
      })
      .catch(() => {
        systems.value = []
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }

  function reset() {
    systems.value = []
    loaded.value = false
  }

  async function fetchSummary(key: string, hours: number): Promise<AnalyticsSummary> {
    const res = await HttpClient.get(ApiRoute.ANALYTICS.SUMMARY(key, hours))
    return res.data.data
  }

  // ── Owner-only administration ──
  async function adminListSystems(): Promise<AnalyticsSystemAdmin[]> {
    const res = await HttpClient.get(ApiRoute.ANALYTICS.ADMIN_SYSTEMS)
    return res.data.data
  }

  async function adminSaveSystem(system: AnalyticsSystemAdmin): Promise<AnalyticsSystemAdmin[]> {
    const res = await HttpClient.post(ApiRoute.ANALYTICS.ADMIN_SYSTEMS, system)
    return res.data.data
  }

  async function adminListAccess(key: string): Promise<AnalyticsGrant[]> {
    const res = await HttpClient.get(ApiRoute.ANALYTICS.ADMIN_ACCESS(key))
    return res.data.data
  }

  async function adminGrant(key: string, username: string): Promise<AnalyticsGrant[]> {
    const res = await HttpClient.post(ApiRoute.ANALYTICS.ADMIN_ACCESS(key), { username })
    return res.data.data
  }

  async function adminRevoke(key: string, userId: number): Promise<AnalyticsGrant[]> {
    const res = await HttpClient.post(ApiRoute.ANALYTICS.ADMIN_REVOKE(key, userId), {})
    return res.data.data
  }

  return {
    systems,
    loaded,
    loadSystems,
    reset,
    fetchSummary,
    adminListSystems,
    adminSaveSystem,
    adminListAccess,
    adminGrant,
    adminRevoke,
  }
})
