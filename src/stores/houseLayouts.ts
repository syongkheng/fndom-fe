import { defineStore, storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { AxiosError } from 'axios'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { useToast } from '@/composables/useToast'
import { useHousePlanStore } from '@/stores/housePlan'
import { useAuthenticationStore } from '@/stores/authentication'
import { i18n } from '@/i18n'

export interface LayoutSummary {
  id: string
  name: string
  itemCount: number
  createdAt: number
  updatedAt: number
}

export const MAX_LAYOUT_NAME = 100
const AUTOSAVE_KEY = 'fndom-house-autosave'
const AUTOSAVE_DELAY_MS = 2000

export type SaveStatus = 'local' | 'saved' | 'unsaved' | 'saving' | 'error'

/** Saved house layouts on the backend (qindom /house-layout). The planner itself still works logged out from localStorage. */
export const useHouseLayoutsStore = defineStore('houseLayouts', () => {
  const toast = useToast()
  const house = useHousePlanStore()
  const { isAuthenticated } = storeToRefs(useAuthenticationStore())
  const t = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params ?? {})

  const layouts = ref<LayoutSummary[]>([])
  const isLoading = ref(false)
  const busy = ref(false)
  const dialogOpen = ref(false)
  /** The saved layout the planner was last saved to or loaded from, so "Update" knows its target. */
  const currentId = ref<string | null>(null)

  /** What the open saved layout looked like when last saved / loaded, to tell whether there are unsaved edits. */
  const savedSnapshot = ref<string | null>(null)
  const saving = ref(false)
  const saveFailed = ref(false)
  const autosave = ref(true)
  try {
    autosave.value = localStorage.getItem(AUTOSAVE_KEY) !== '0'
  } catch {
    /* storage unavailable: keep the default */
  }
  watch(autosave, (on) => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, on ? '1' : '0')
    } catch {
      /* ignore */
    }
  })

  const dirty = computed(() => !!currentId.value && savedSnapshot.value !== null && house.exportJson() !== savedSnapshot.value)
  const status = computed<SaveStatus>(() => {
    if (!isAuthenticated.value || !currentId.value) return 'local'
    if (saving.value) return 'saving'
    if (saveFailed.value && dirty.value) return 'error'
    return dirty.value ? 'unsaved' : 'saved'
  })

  /** Stops treating the planner as an edit of a saved layout (after a replace like the sample home or an import). */
  function detach() {
    currentId.value = null
    savedSnapshot.value = null
    saveFailed.value = false
  }

  const sort = () => layouts.value.sort((a, b) => b.updatedAt - a.updatedAt)

  function reset() {
    layouts.value = []
    detach()
  }

  watch(isAuthenticated, (ok) => {
    if (!ok) reset()
  })

  async function fetchLayouts() {
    if (!isAuthenticated.value) return
    isLoading.value = true
    const res = await HttpClient.get(ApiRoute.HOUSE_LAYOUT.GET_ALL).catch(() => null)
    const list = res?.data?.data?.layouts as LayoutSummary[] | undefined
    if (list) {
      layouts.value = list
      if (currentId.value && !list.some((l) => l.id === currentId.value)) detach()
    } else {
      toast.error(t('house.layouts.loadFailed'))
    }
    isLoading.value = false
  }

  /** Runs one write at a time; returns null (after a toast) when it fails. */
  async function write<T>(failKey: string, run: () => Promise<T>): Promise<T | null> {
    if (busy.value) return null
    busy.value = true
    try {
      return await run()
    } catch (e) {
      const status = (e as AxiosError).response?.status
      toast.error(t(status === 400 ? `${failKey}Invalid` : failKey))
      return null
    } finally {
      busy.value = false
    }
  }

  async function saveNew(name: string): Promise<boolean> {
    const clean = name.trim().slice(0, MAX_LAYOUT_NAME)
    if (!clean) return false
    const created = await write('house.layouts.saveFailed', async () => {
      const res = await HttpClient.post(ApiRoute.HOUSE_LAYOUT.CREATE, { name: clean, data: house.layoutData() })
      return res.data.data as LayoutSummary
    })
    if (!created) return false
    layouts.value.push(created)
    sort()
    currentId.value = created.id
    savedSnapshot.value = house.exportJson()
    toast.success(t('house.layouts.saved', { name: created.name }))
    return true
  }

  /** Saves the planner over the open saved layout. `silent` (autosave) skips the toasts and just flags a failure in the status. */
  async function updateCurrent(silent = false): Promise<boolean> {
    const id = currentId.value
    if (!id || busy.value || house.readOnly) return false // never write a shared house over the user's saved layout
    const sent = house.exportJson()
    busy.value = true
    saving.value = true
    try {
      const res = await HttpClient.post(ApiRoute.HOUSE_LAYOUT.UPDATE(id), { data: house.layoutData() })
      const updated = res.data.data as LayoutSummary
      const i = layouts.value.findIndex((l) => l.id === id)
      if (i >= 0) layouts.value[i] = updated
      sort()
      if (currentId.value === id) savedSnapshot.value = sent
      saveFailed.value = false
      if (!silent) toast.success(t('house.layouts.updated', { name: updated.name }))
      return true
    } catch (e) {
      saveFailed.value = true
      if (!silent) toast.error(t((e as AxiosError).response?.status === 400 ? 'house.layouts.saveFailedInvalid' : 'house.layouts.saveFailed'))
      return false
    } finally {
      busy.value = false
      saving.value = false
    }
  }

  // Autosave: a couple of seconds after the last edit to the open saved layout. Never saves an empty plan (that would
  // silently blank a saved layout after "Clear all"; use Update for that on purpose).
  let autosaveTimer: ReturnType<typeof setTimeout> | undefined
  function runAutosave() {
    if (house.readOnly || !autosave.value || !currentId.value || !isAuthenticated.value || !dirty.value || !house.items.length) return
    if (busy.value) {
      autosaveTimer = setTimeout(runAutosave, 1000)
      return
    }
    void updateCurrent(true)
  }
  watch(
    () => house.exportJson(),
    () => {
      clearTimeout(autosaveTimer)
      if (!house.readOnly && autosave.value && currentId.value && dirty.value) autosaveTimer = setTimeout(runAutosave, AUTOSAVE_DELAY_MS)
    },
  )

  async function rename(id: string, name: string): Promise<boolean> {
    const clean = name.trim().slice(0, MAX_LAYOUT_NAME)
    if (!clean) return false
    const updated = await write('house.layouts.saveFailed', async () => {
      const res = await HttpClient.post(ApiRoute.HOUSE_LAYOUT.UPDATE(id), { name: clean })
      return res.data.data as LayoutSummary
    })
    if (!updated) return false
    const i = layouts.value.findIndex((l) => l.id === id)
    if (i >= 0) layouts.value[i] = updated
    sort()
    return true
  }

  async function load(id: string): Promise<boolean> {
    const loaded = await write('house.layouts.loadFailed', async () => {
      const res = await HttpClient.get(ApiRoute.HOUSE_LAYOUT.GET(id))
      return res.data.data as LayoutSummary & { data: unknown }
    })
    if (!loaded) return false
    if (house.applyLayout(loaded.data) === null) {
      toast.error(t('house.layouts.loadFailed'))
      return false
    }
    currentId.value = id
    savedSnapshot.value = house.exportJson()
    saveFailed.value = false
    toast.success(t('house.layouts.loaded', { name: loaded.name }))
    return true
  }

  async function remove(id: string): Promise<boolean> {
    const ok = await write('house.layouts.deleteFailed', async () => {
      await HttpClient.post(ApiRoute.HOUSE_LAYOUT.DELETE(id), {})
      return true
    })
    if (!ok) return false
    layouts.value = layouts.value.filter((l) => l.id !== id)
    if (currentId.value === id) detach()
    return true
  }

  return { layouts, isLoading, busy, dialogOpen, currentId, autosave, dirty, status, detach, fetchLayouts, saveNew, updateCurrent, rename, load, remove, reset }
})
