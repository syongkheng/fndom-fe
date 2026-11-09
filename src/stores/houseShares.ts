import { defineStore, storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import type { AxiosError } from 'axios'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { useToast } from '@/composables/useToast'
import { useHousePlanStore } from '@/stores/housePlan'
import { useAuthenticationStore } from '@/stores/authentication'
import { MAX_LAYOUT_NAME } from '@/stores/houseLayouts'
import { i18n } from '@/i18n'

export interface ShareSummary {
  token: string
  name: string
  itemCount: number
  createdAt: number
}

/** Public read-only share links for a house (qindom /house/share). A link is a snapshot taken when it is made. */
export const useHouseSharesStore = defineStore('houseShares', () => {
  const toast = useToast()
  const house = useHousePlanStore()
  const { isAuthenticated } = storeToRefs(useAuthenticationStore())
  const t = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params ?? {})

  const shares = ref<ShareSummary[]>([])
  const isLoading = ref(false)
  const busy = ref(false)
  const dialogOpen = ref(false)

  watch(isAuthenticated, (ok) => {
    if (!ok) shares.value = []
  })

  /** The full URL anyone can open. */
  const urlFor = (token: string) => new URL(`house/view/${token}`, new URL(import.meta.env.BASE_URL, window.location.origin)).href

  async function fetchShares() {
    if (!isAuthenticated.value) return
    isLoading.value = true
    const res = await HttpClient.get(ApiRoute.HOUSE_SHARE.GET_ALL).catch(() => null)
    const list = res?.data?.data?.shares as ShareSummary[] | undefined
    if (list) shares.value = list
    else toast.error(t('house.share.loadFailed'))
    isLoading.value = false
  }

  /** Snapshots the planner as a new link; returns its URL, or null (after a toast) on failure. */
  async function create(name: string): Promise<string | null> {
    const clean = name.trim().slice(0, MAX_LAYOUT_NAME)
    if (!clean || busy.value) return null
    busy.value = true
    try {
      const res = await HttpClient.post(ApiRoute.HOUSE_SHARE.CREATE, { name: clean, data: house.layoutData() })
      const made = res.data.data as ShareSummary
      shares.value.unshift(made)
      return urlFor(made.token)
    } catch (e) {
      toast.error(t((e as AxiosError).response?.status === 400 ? 'house.share.createInvalid' : 'house.share.createFailed'))
      return null
    } finally {
      busy.value = false
    }
  }

  async function revoke(token: string): Promise<boolean> {
    if (busy.value) return false
    busy.value = true
    try {
      await HttpClient.post(ApiRoute.HOUSE_SHARE.REVOKE(token))
      shares.value = shares.value.filter((s) => s.token !== token)
      return true
    } catch {
      toast.error(t('house.share.revokeFailed'))
      return false
    } finally {
      busy.value = false
    }
  }

  return { shares, isLoading, busy, dialogOpen, urlFor, fetchShares, create, revoke }
})
