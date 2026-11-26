<script lang="ts" setup>
import { useToast } from '@/composables/useToast'
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { useRoute } from 'vue-router'
import { useNav } from '@/hooks/useNav'
import { useItineraryStore } from '@/stores/itinerary'
import { useBreakpointManager } from '@/hooks/useBreakpointManager'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useAuthenticationStore } from '@/stores/authentication'
import { storeToRefs } from 'pinia'
import { getCategoryIcon, PACKING_CATEGORIES } from '@/constants/TravelCategories'
import { PIN_ICON_SVG, CATEGORY_ICON_SVG } from '@/constants/TravelIconSvg'
import TravelIcon from '@/components/icons/TravelIcon.vue'
import type { AgendaItem } from '@/interfaces/forms/itinerary/AgendaItem'
import type { PackingItem } from '@/interfaces/forms/itinerary/PackingItem'
import type { NoteItem } from '@/interfaces/forms/itinerary/NoteItem'
import AgendaDrawer from '@/components/views/travel/AgendaDrawer.vue'
import PackingDrawer from '@/components/views/travel/PackingDrawer.vue'
import TravelMapView from '@/components/views/travel/TravelMapView.vue'
import TravelShareDialog from '@/components/views/travel/TravelShareDialog.vue'
import QuickAddInput from '@/components/views/travel/QuickAddInput.vue'
import {
  AGENDA_TITLE_MAX_LENGTH,
  NOTE_LABEL_MAX_LENGTH,
  PACKING_LABEL_MAX_LENGTH,
  TRIP_DESTINATION_MAX_LENGTH,
  TRIP_TITLE_MAX_LENGTH,
} from '@/constants/TravelLimits'
import DayChipMenu from '@/components/views/travel/DayChipMenu.vue'
import PackingSuggestionPanel, { type PackingSuggestion } from '@/components/views/travel/PackingSuggestionPanel.vue'
import NoteSuggestionPanel, { type NoteSuggestion } from '@/components/views/travel/NoteSuggestionPanel.vue'
import {
  useTravelDayGroups, resolveStartKey, dateKeyForDay, formatShortDate, sortByTime,
} from '@/composables/useTravelDayGroups'
import { useTravelExport } from '@/composables/useTravelExport'
import { useCityLabel } from '@/composables/useCityLabel'
import { searchPlaces } from '@/composables/useGeocode'
import { useI18n } from 'vue-i18n'
import { Delete, Lock, Money, Camera, Check, Link, Edit, Share, MapLocation, Plus, ArrowDown, Sort } from '@element-plus/icons-vue'

const route = useRoute()
const nav = useNav()
const itineraryStore = useItineraryStore()
const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const { itinerary } = storeToRefs(itineraryStore)
const {
  addPackingItem, removePackingItem, updatePackingItem, togglePackingItem,
  addNoteItem, removeNoteItem, toggleNoteItem,
  assignItemDay, addQuickAgendaItem,
  saveDraft, loadDraft, migrateDraft,
} = itineraryStore
const { isAuthenticated } = storeToRefs(authStore)
const { t } = useI18n()
const toast = useToast()

const sessionId = route.params.sessionId as string
const isDraft = computed(() => route.path === '/travel/draft')
const loading = ref(true)

// ── Responsive ───────────────────────────────────────────────────────────────
const { width } = useBreakpointManager()
const isMobile = computed(() => width.value <= 600)
const isSplit = computed(() => width.value > 900)
const drawerDirection = computed(() => isMobile.value ? 'btt' : 'rtl')
const drawerSize = computed(() => isMobile.value ? '92%' : '420px')

// ── Day model ────────────────────────────────────────────────────────────────
// The trip is planned by day number. Day 1..N always exist (N = duration), a
// day's calendar date is derived from the trip start when the trip has one.
const { getCardCity } = useCityLabel()
const agendaItems = computed(() => itinerary.value.agendaItems ?? [])
const startKey = computed(() => itinerary.value.unknownDate ? undefined : resolveStartKey(itinerary.value.itineraryDateRaw, itinerary.value.startDate))
const dayCtx = computed(() => ({ startKey: startKey.value, durationInDays: itinerary.value.durationInDays }))
const { dayOf, groupedByDate } = useTravelDayGroups(agendaItems, dayCtx)

const listTypeOf = (i: AgendaItem): 'todo' | 'place' => (i.listType ?? (i as any).list_type ?? 'todo')
const itemKey = (i: AgendaItem) => String(i.id ?? i._localIndex)

const maxItemDay = computed(() => agendaItems.value.reduce((m, i) => Math.max(m, dayOf(i) ?? 0), 0))
const dayCount = computed(() => {
  const duration = Math.max(1, Number(itinerary.value.durationInDays) || 1)
  // Undated trips grow to fit whatever day an item was put on; dated trips
  // keep their real length and surface stragglers under "outside trip dates".
  return startKey.value ? duration : Math.max(duration, maxItemDay.value)
})

const dayDateKey = (n: number) => (startKey.value ? dateKeyForDay(startKey.value, n) : undefined)
const dayLabel = (n: number) => {
  const key = dayDateKey(n)
  return key ? formatShortDate(key) : t('travel.planner.dayN', { n })
}

interface BoardDay { n: number; items: AgendaItem[] }
const board = computed<BoardDay[]>(() =>
  Array.from({ length: dayCount.value }, (_, i) => {
    const n = i + 1
    return { n, items: sortByTime(agendaItems.value.filter((it) => dayOf(it) === n)) }
  }),
)
const outsideItems = computed(() =>
  sortByTime(agendaItems.value.filter((it) => { const d = dayOf(it); return d !== undefined && (d < 1 || d > dayCount.value) })),
)
const unscheduled = computed(() => agendaItems.value.filter((it) => dayOf(it) === undefined))
const scheduledCount = computed(() => agendaItems.value.length - unscheduled.value.length)

// Ideas tray filter
const ideasFilter = ref<'all' | 'todo' | 'place'>('all')
const ideas = computed(() => unscheduled.value.filter((it) => ideasFilter.value === 'all' || listTypeOf(it) === ideasFilter.value))

// Collapsed days (per trip, in memory)
const collapsed = ref(new Set<number>())
const toggleDayCollapsed = (n: number) => {
  const next = new Set(collapsed.value)
  next.has(n) ? next.delete(n) : next.add(n)
  collapsed.value = next
}
const allCollapsed = computed(() => board.value.length > 0 && board.value.every((d) => collapsed.value.has(d.n)))
const toggleAll = () => { collapsed.value = allCollapsed.value ? new Set() : new Set(board.value.map((d) => d.n)) }

// Scheduling: set the day and, when the trip has dates, the matching date.
const scheduleItem = (item: AgendaItem, day: number | undefined) => {
  const date = day ? dayDateKey(day) : undefined
  assignItemDay(item, date, day)
  if (day && collapsed.value.has(day)) toggleDayCollapsed(day)
}

// Trip dates changed: pin every item to its day number first, then re-derive
// dates from the new start so Day 2 stays Day 2 when the trip shifts.
const onDatesChange = (v: string[] | null) => {
  const pinned = agendaItems.value.map((it) => dayOf(it))
  if (!v || v.length !== 2) {
    // null (not undefined, which JSON drops) so clearing the dates persists; the public viewer
    // reads startDate / itineraryDateRaw without looking at unknownDate.
    itinerary.value.itineraryDateRaw = null
    itinerary.value.startDate = null
    itinerary.value.endDate = null
    itinerary.value.unknownDate = true
  } else {
    itinerary.value.unknownDate = false
    itineraryStore.onItineraryDateSelection(v)
  }
  agendaItems.value.forEach((it, idx) => {
    const d = pinned[idx]
    it.day = d
    it.date = d ? dayDateKey(d) ?? '' : ''
    if (it.id) { it._isDirty = true; itinerary.value._agendaIdsToUpdate?.push(it.id) }
  })
}

const onDurationChange = (n: number | undefined) => {
  if (!n || n < 1) return
  itinerary.value.durationInDays = n
}

// ── Drag & drop (pointer devices; the day chip menu covers touch) ───────────
const draggingKey = ref<string | null>(null)
const dropTarget = ref<string | null>(null)

const onDragStart = (e: DragEvent, item: AgendaItem) => {
  draggingKey.value = itemKey(item)
  e.dataTransfer?.setData('text/plain', draggingKey.value)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
const onDragEnd = () => { draggingKey.value = null; dropTarget.value = null }
const onDragOver = (e: DragEvent, target: string) => {
  if (!draggingKey.value) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dropTarget.value = target
}
const onDrop = (e: DragEvent, day: number | undefined) => {
  e.preventDefault()
  const key = e.dataTransfer?.getData('text/plain') || draggingKey.value
  const item = agendaItems.value.find((it) => itemKey(it) === key)
  if (item && dayOf(item) !== day) scheduleItem(item, day)
  onDragEnd()
}

// ── Quick add ────────────────────────────────────────────────────────────────
const quickAddIdea = (title: string) => {
  addQuickAgendaItem(title, { listType: ideasFilter.value === 'place' ? 'place' : 'todo' })
}
const quickAddToDay = (n: number, title: string) => {
  addQuickAgendaItem(title, { day: n, date: dayDateKey(n) })
  if (collapsed.value.has(n)) toggleDayCollapsed(n)
}
const quickAddPacking = (label: string) => {
  const exists = (itinerary.value.packingItems ?? []).some((p) => p.label?.toLowerCase() === label.toLowerCase())
  if (exists) return
  addPackingItem({ _localIndex: `packing-${Date.now()}`, label, category: 'misc', packed: false })
}
const quickAddNote = (label: string) => addNoteItem({ label, done: false })

// ── Delete with undo ─────────────────────────────────────────────────────────
const removeAgendaItem = (item: AgendaItem) => {
  const list = itinerary.value.agendaItems
  const index = list.findIndex((i) => itemKey(i) === itemKey(item))
  if (index === -1) return
  const [removed] = list.splice(index, 1)
  if (removed.id != null) itinerary.value._agendaIdsToDelete?.push(removed.id)
  toast.action(t('travel.planner.itemDeleted'), {
    label: t('travel.planner.undo'),
    onClick: () => {
      if (removed.id != null) {
        const del = itinerary.value._agendaIdsToDelete
        const di = del?.indexOf(removed.id) ?? -1
        if (di !== -1) del!.splice(di, 1)
      }
      itinerary.value.agendaItems.splice(Math.min(index, itinerary.value.agendaItems.length), 0, removed)
    },
  }, { ring: true, duration: 6000 })
}

// ── Agenda drawer ────────────────────────────────────────────────────────────
const drawerVisible = ref(false)
const drawerIsNew = ref(false)
const drawerEditKey = ref<string | undefined>()
const drawerItem = ref<AgendaItem | null>(null)
const drawerUploading = ref(false)

const makeBlankDraft = (day?: number, listType: 'todo' | 'place' = 'todo'): AgendaItem => ({
  _localIndex: `agenda-${Date.now()}`,
  category: undefined,
  listType,
  title: '',
  desc: '',
  day,
  date: day ? dayDateKey(day) ?? '' : '',
  city: '',
  cityRaw: [],
  unknownTime: true,
  startTime: undefined,
  endTime: undefined,
  files: [],
  _fileIdsToDelete: [],
  _filesToInsert: [],
  _agendaToFileMapping: [],
})

const openAddDrawer = (day?: number, listType: 'todo' | 'place' = 'todo') => {
  drawerIsNew.value = true
  drawerEditKey.value = undefined
  drawerItem.value = makeBlankDraft(day, listType)
  drawerVisible.value = true
}

const openEditDrawer = (item: AgendaItem) => {
  const row = item as any
  drawerIsNew.value = false
  drawerEditKey.value = itemKey(item)
  const cityRaw: string[] = item.cityRaw?.length
    ? item.cityRaw
    : (() => { try { return JSON.parse((row.city_raw ?? row.city) ?? '[]') } catch { return [] } })()
  drawerItem.value = {
    ...item,
    day: dayOf(item),
    startTime: item.startTime ?? (row.start_time as string | undefined) ?? undefined,
    endTime: item.endTime ?? (row.end_time as string | undefined) ?? undefined,
    unknownTime: item.unknownTime !== undefined ? item.unknownTime : !!row.unknown_time,
    cityRaw,
    // null when unset: a later "save without touching the place" then sends null (no-op), never drops the key.
    coordinates: item.coordinates ?? null,
    _filesToInsert: item._filesToInsert ?? [],
    _fileIdsToDelete: item._fileIdsToDelete ?? [],
    _agendaToFileMapping: item._agendaToFileMapping ?? [],
  }
  drawerVisible.value = true
}

const withDerivedDate = (item: AgendaItem): AgendaItem => ({
  ...item,
  day: item.day && item.day > 0 ? item.day : undefined,
  date: item.day && item.day > 0 ? dayDateKey(item.day) ?? '' : '',
})

const onDrawerSave = (item: AgendaItem) => {
  const next = withDerivedDate(item)
  if (drawerIsNew.value) {
    itinerary.value.agendaItems.push(next)
  } else {
    const idx = itinerary.value.agendaItems.findIndex((i) => itemKey(i) === drawerEditKey.value)
    if (idx !== -1) {
      itinerary.value.agendaItems[idx] = next
      if (next.id) { next._isDirty = true; itinerary.value._agendaIdsToUpdate?.push(next.id) }
    }
  }
  fetchFileBlobs([next])
  drawerVisible.value = false
}

const onDrawerSync = (item: AgendaItem) => {
  const key = drawerEditKey.value
  if (!key) return
  const idx = itinerary.value.agendaItems.findIndex((i) => itemKey(i) === key)
  if (idx !== -1) itinerary.value.agendaItems[idx] = withDerivedDate(item)
}

// ── Card helpers ─────────────────────────────────────────────────────────────
const getCardTime = (item: AgendaItem) => {
  const row = item as any
  const unknownTime = item.unknownTime || !!row.unknown_time
  const st = item.startTime ?? row.start_time
  if (unknownTime || !st) return null
  const toHHMM = (val: any) => {
    if (typeof val === 'string') return val.slice(0, 5)
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  const start = toHHMM(st)
  if (!start) return null
  const et = item.endTime ?? row.end_time
  const end = et ? toHHMM(et) : null
  return end ? `${start} – ${end}` : start
}

const fileBlobs = ref<Map<string, string>>(new Map())
const fetchFileBlobs = async (items: AgendaItem[]) => {
  const allFiles = items.flatMap((item) => item.files ?? [])
  if (!allFiles.length) return
  await Promise.allSettled(
    allFiles.map(async (file: any) => {
      const shortCode = file.tgShortCode ?? file.tg_short_code
      if (!file.uuid || !shortCode) return
      if (fileBlobs.value.has(file.uuid)) return
      const res = await HttpClient.get(ApiRoute.TG_IMG.GET(shortCode), { responseType: 'arraybuffer' }).catch(() => null)
      if (res?.data) {
        const bytes = new Uint8Array(res.data)
        let binary = ''
        bytes.forEach((b) => (binary += String.fromCharCode(b)))
        const mime = ((res.headers?.['content-type'] as string | undefined) ?? 'image/jpeg').split(';')[0]
        fileBlobs.value.set(file.uuid, `data:${mime};base64,${btoa(binary)}`)
      }
    }),
  )
}
const cardImages = (item: AgendaItem) => (item.files ?? []).filter((f: any) => fileBlobs.value.get(f.uuid))

// ── Packing ──────────────────────────────────────────────────────────────────
const packingDrawerVisible = ref(false)
const packingDrawerIsNew = ref(false)
const packingDrawerItem = ref<PackingItem | null>(null)

const openEditPackingDrawer = (item: PackingItem) => {
  packingDrawerIsNew.value = false
  packingDrawerItem.value = { ...item }
  packingDrawerVisible.value = true
}
const onPackingDrawerSave = (item: PackingItem) => {
  if (packingDrawerIsNew.value) addPackingItem(item)
  else updatePackingItem(item)
}

const packingList = computed(() => itinerary.value.packingItems ?? [])
const packingItemsByCategory = computed(() => {
  const known = new Set<string>(PACKING_CATEGORIES.map((c) => c.key))
  return PACKING_CATEGORIES
    .map((cat) => ({
      cat,
      // Anything with an unknown/blank category lands under "misc" so it
      // never silently disappears from the list.
      items: packingList.value.filter((i) => i.category === cat.key || (cat.key === 'misc' && !known.has(i.category))),
    }))
    .filter((g) => g.items.length > 0)
})
const packingPackedCount = computed(() => packingList.value.filter((i) => i.packed).length)

const draggingPacking = ref(false)
const onDropPacking = (e: DragEvent) => {
  draggingPacking.value = false
  const raw = e.dataTransfer?.getData('suggestion/packing')
  if (!raw) return
  try { onPackingAdd(JSON.parse(raw)) } catch { /* ignore */ }
}
const onPackingAdd = (s: PackingSuggestion) => {
  const already = packingList.value.some((p) => p.label?.toLowerCase() === s.label.toLowerCase())
  if (already) return
  addPackingItem({ _localIndex: `packing-${Date.now()}`, label: s.label, category: s.category || 'misc', packed: false })
}

// ── Notes ────────────────────────────────────────────────────────────────────
const noteItemsList = computed(() => itinerary.value.noteItems ?? [])
const onNoteAdd = (s: NoteSuggestion) => {
  const already = noteItemsList.value.some((n) => n.label?.toLowerCase() === s.title.toLowerCase())
  if (already) return
  addNoteItem({ label: s.title, category: s.category ?? undefined, url: s.url, done: false })
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
type PlannerTab = 'plan' | 'packing' | 'notes'
const activeTab = ref<PlannerTab>('plan')
const tabs = computed(() => [
  { key: 'plan' as PlannerTab, label: t('travel.planner.tabPlan'), icon: CATEGORY_ICON_SVG.attraction, count: agendaItems.value.length },
  { key: 'packing' as PlannerTab, label: t('travel.planner.tabPacking'), icon: PIN_ICON_SVG, count: packingList.value.length },
  { key: 'notes' as PlannerTab, label: t('travel.planner.tabNotes'), icon: CATEGORY_ICON_SVG.other, count: noteItemsList.value.length },
])

// ── Map (progressive: only offered once something can be plotted) ───────────
const MAP_OPEN_KEY = 'fndom-planner-map-open'
const hasGeo = computed(() => agendaItems.value.some((i: any) =>
  i.coordinates || i.placeDisplay || (i.cityRaw?.length) || (typeof i.city === 'string' && i.city.trim() && i.city !== '[]'),
))
const mapOpen = ref(localStorage.getItem(MAP_OPEN_KEY) === 'true')
watch(mapOpen, (v) => localStorage.setItem(MAP_OPEN_KEY, String(v)))
const showMap = computed(() => hasGeo.value && mapOpen.value)
const isMapFullscreen = ref(false)

// ── Destination ──────────────────────────────────────────────────────────────
const fetchDestinationSuggestions = async (query: string, cb: (results: { value: string }[]) => void) => {
  if (!query.trim()) { cb([]); return }
  try {
    const places = await searchPlaces(query)
    cb(places.map((p) => ({ value: p.shortName })))
  } catch {
    cb([])
  }
}

// ── Export ───────────────────────────────────────────────────────────────────
const itineraryAsNullable = computed(() => itinerary.value as any)
const { exportJSON, exportCSV, exportICS } = useTravelExport(itineraryAsNullable, groupedByDate as any, getCardCity)

// ── Load ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  if (isDraft.value) {
    itineraryStore.resetItinerary()
    loadDraft()
    loading.value = false
    return
  }
  if (!isAuthenticated.value) {
    layoutStore.loginDialog.setTrue()
    loading.value = false
    return
  }
  const loadResult = await itineraryStore.retrieveItineraryForUpdate(sessionId)
  loading.value = false
  if (loadResult.forbidden) {
    toast.error(t('travel.planner.notYours'))
    nav.redirectTo('/travel/trips')
    return
  }
  fetchFileBlobs(itinerary.value.agendaItems ?? [])
})

// ── Autosave (the only save path) ────────────────────────────────────────────
type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'
const saveStatus = ref<SaveStatus>('idle')
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
let savedResetTimer: ReturnType<typeof setTimeout> | null = null
let skipNextWatch = true
let inflight = false

const runSave = async () => {
  if (drawerUploading.value) { autoSaveTimer = setTimeout(runSave, 1500); return }
  if (inflight) return
  inflight = true
  saveStatus.value = 'saving'
  const result = await itineraryStore.updateItinerary()
  inflight = false
  // Edits made while the request was in flight flip the status back to
  // pending; save again so nothing is left behind.
  if ((saveStatus.value as SaveStatus) === 'pending') { runSave(); return }
  saveStatus.value = result.isSuccess ? 'saved' : 'error'
  if (result.error === 'auth') toast.warning(t('travel.planner.loginToSave'))
  if (result.isSuccess) {
    if (savedResetTimer) clearTimeout(savedResetTimer)
    savedResetTimer = setTimeout(() => { if (saveStatus.value === 'saved') saveStatus.value = 'idle' }, 2500)
  }
}

watch(
  () => JSON.stringify(itinerary.value),
  () => {
    if (skipNextWatch) { skipNextWatch = false; return }
    if (isDraft.value) { saveDraft(); return }
    if (!isAuthenticated.value || !itinerary.value.id) return
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    saveStatus.value = 'pending'
    autoSaveTimer = setTimeout(runSave, 1500)
  },
)

const saveNow = () => {
  if (saveStatus.value === 'pending' || saveStatus.value === 'error') {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    runSave()
  }
}

const onBeforeUnload = (e: BeforeUnloadEvent) => {
  if (saveStatus.value === 'pending' || saveStatus.value === 'saving') { e.preventDefault(); e.returnValue = '' }
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
})

// ── Draft migration ──────────────────────────────────────────────────────────
watch(isAuthenticated, async (authed) => {
  if (!authed || !isDraft.value) return
  const newSessionId = await migrateDraft()
  if (newSessionId) {
    toast.success(t('travel.planner.draftMigrated'))
    nav.redirectTo(`/travel/${newSessionId}`)
  }
})

// ── Share ────────────────────────────────────────────────────────────────────
const shareOpen = ref(false)
// null (not undefined) so the key is sent and the server clears the code; undefined would be dropped and keep it.
const onChallengeChange = (code: string | undefined) => { itinerary.value.challenge = code ?? null }
</script>

<template>
  <div class="planner-view">

    <!-- Auth gate -->
    <div v-if="!isAuthenticated && !isDraft" class="planner-auth-gate">
      <div class="auth-gate-icon"><el-icon><Lock /></el-icon></div>
      <p class="auth-gate-text">{{ t('travel.planner.loginPrompt') }}</p>
      <el-button type="primary" @click="layoutStore.loginDialog.setTrue()">{{ t('travel.planner.login') }}</el-button>
    </div>

    <template v-else>

    <!-- Top bar -->
    <div class="planner-topbar">
      <el-button link @click="nav.redirectTo('/travel/trips')" class="back-btn">{{ t('travel.planner.back') }}</el-button>
      <div class="planner-actions">
        <button
          v-if="!isDraft && saveStatus !== 'idle'"
          type="button"
          class="save-chip"
          :class="`save-chip--${saveStatus}`"
          :disabled="saveStatus === 'saving' || saveStatus === 'saved'"
          @click="saveNow"
        >
          <span class="save-chip-dot" />
          {{ saveStatus === 'pending' ? t('travel.planner.statusPending')
            : saveStatus === 'saving' ? t('travel.planner.autoSaving')
            : saveStatus === 'saved' ? t('travel.planner.autoSaved')
            : t('travel.planner.autoSaveFail') }}
        </button>
        <el-button v-if="hasGeo && !isMobile" size="small" :type="showMap ? 'primary' : 'default'" plain @click="mapOpen = !mapOpen">
          <el-icon><MapLocation /></el-icon> {{ t('travel.planner.map') }}
        </el-button>
        <el-dropdown size="small" trigger="click" @command="(cmd: string) => cmd === 'json' ? exportJSON() : cmd === 'csv' ? exportCSV() : exportICS()">
          <el-button size="small">{{ t('travel.planner.exportBtn') }} <el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="json">{{ t('travel.planner.exportJson') }}</el-dropdown-item>
              <el-dropdown-item command="csv">{{ t('travel.planner.exportCsv') }}</el-dropdown-item>
              <el-dropdown-item command="ics">{{ t('travel.planner.exportIcs') }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button size="small" type="primary" @click="shareOpen = true">
          <el-icon><component :is="itinerary.challenge ? Lock : Share" /></el-icon> {{ t('travel.planner.share') }}
        </el-button>
      </div>
    </div>

    <!-- Trip header -->
    <div class="planner-header">
      <el-input v-model="itinerary.sessionTitle" class="title-input" :maxlength="TRIP_TITLE_MAX_LENGTH" :placeholder="t('travel.planner.tripTitle')" />
      <div class="header-meta">
        <el-autocomplete
          v-model="itinerary.destination"
          :maxlength="TRIP_DESTINATION_MAX_LENGTH"
          :fetch-suggestions="fetchDestinationSuggestions"
          :placeholder="t('travel.planner.destination')"
          size="small"
          class="meta-destination"
        />
        <el-date-picker
          :model-value="startKey ? itinerary.itineraryDateRaw : null"
          type="daterange"
          :range-separator="t('travel.list.dialog.to')"
          :start-placeholder="t('travel.planner.start')"
          :end-placeholder="t('travel.planner.end')"
          size="small"
          value-format="YYYY-MM-DD"
          class="meta-dates"
          @update:model-value="(v: string[] | null) => onDatesChange(v)"
        />
        <div class="meta-days">
          <el-input-number
            :model-value="itinerary.durationInDays"
            :min="1"
            :max="60"
            size="small"
            :disabled="!!startKey"
            controls-position="right"
            @update:model-value="onDurationChange"
          />
          <span class="meta-days-label">{{ t('travel.planner.days') }}</span>
        </div>
        <div class="meta-days">
          <el-input-number v-model="itinerary.numberOfPax" :min="1" size="small" controls-position="right" />
          <span class="meta-days-label">{{ t('travel.planner.pax') }}</span>
        </div>
      </div>
    </div>

    <!-- Draft banner -->
    <div v-if="isDraft" class="draft-banner">
      <el-icon><Lock /></el-icon> {{ t('travel.planner.draftBanner') }}
      <el-button size="small" type="primary" @click="layoutStore.loginDialog.setTrue()">{{ t('nav.login') }}</el-button>
    </div>

    <!-- Tabs -->
    <div class="planner-tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        role="tab"
        class="planner-tab"
        :class="{ 'planner-tab--active': activeTab === tab.key }"
        :aria-selected="activeTab === tab.key"
        @click="activeTab = tab.key"
      >
        <span class="planner-tab-icon"><TravelIcon :svg="tab.icon" /></span>
        {{ tab.label }}
        <span v-if="tab.count" class="planner-tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <div class="planner-layout">

    <div class="planner-content" v-show="isSplit || !showMap">

      <div v-if="loading" class="planner-loading">
        <el-skeleton :rows="5" animated />
      </div>

      <!-- ── PLAN: ideas tray + day board ───────────────────────────────── -->
      <div v-else-if="activeTab === 'plan'" class="plan-grid" :class="{ 'plan-grid--with-map': showMap && isSplit }">

        <aside
          class="ideas-tray"
          :class="{ 'drop-target': dropTarget === 'ideas' && draggingKey }"
          @dragover="onDragOver($event, 'ideas')"
          @dragleave="dropTarget = null"
          @drop="onDrop($event, undefined)"
        >
          <div class="ideas-head">
            <div class="ideas-title">{{ t('travel.planner.ideas') }} <span class="ideas-count" v-if="unscheduled.length">{{ unscheduled.length }}</span></div>
            <div class="ideas-filters">
              <button type="button" class="filter-pill" :class="{ active: ideasFilter === 'all' }" @click="ideasFilter = 'all'">{{ t('travel.planner.filterAll') }}</button>
              <button type="button" class="filter-pill" :class="{ active: ideasFilter === 'todo' }" @click="ideasFilter = 'todo'">{{ t('travel.planner.filterTodo') }}</button>
              <button type="button" class="filter-pill" :class="{ active: ideasFilter === 'place' }" @click="ideasFilter = 'place'">{{ t('travel.planner.filterPlace') }}</button>
            </div>
          </div>
          <p class="ideas-hint">{{ t('travel.planner.ideasHint') }}</p>

          <div v-if="ideas.length === 0" class="list-empty">{{ t('travel.planner.noIdeas') }}</div>
          <div v-else class="ideas-list">
            <div
              v-for="item in ideas"
              :key="itemKey(item)"
              class="idea-card"
              :class="{ dragging: draggingKey === itemKey(item) }"
              draggable="true"
              @dragstart="onDragStart($event, item)"
              @dragend="onDragEnd"
              @click="openEditDrawer(item)"
            >
              <TravelIcon :svg="listTypeOf(item) === 'place' ? PIN_ICON_SVG : getCategoryIcon(item.category)" class="idea-icon" />
              <div class="idea-body">
                <div class="idea-title">{{ item.title || t('travel.viewer.untitled') }}</div>
                <div v-if="getCardCity(item)" class="idea-city">{{ getCardCity(item) }}</div>
              </div>
              <div class="idea-actions" @click.stop>
                <DayChipMenu :day="undefined" :day-count="dayCount" :start-key="startKey" @select="(d) => scheduleItem(item, d)" />
                <el-button circle size="small" :title="t('travel.planner.deleteTooltip')" @click="removeAgendaItem(item)">
                  <el-icon style="font-size:0.72rem"><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>

          <QuickAddInput :placeholder="t('travel.planner.quickAddIdea')" :maxlength="AGENDA_TITLE_MAX_LENGTH" compact @submit="quickAddIdea" />
          <button type="button" class="details-link" @click="openAddDrawer(undefined, ideasFilter === 'place' ? 'place' : 'todo')">
            <el-icon><Plus /></el-icon> {{ t('travel.planner.addWithDetails') }}
          </button>
        </aside>

        <section class="day-board">
          <div class="board-controls">
            <span class="board-summary">{{ t('travel.planner.scheduledSummary', { n: scheduledCount, days: dayCount }) }}</span>
            <el-button link size="small" @click="toggleAll">
              <el-icon><Sort /></el-icon> {{ allCollapsed ? t('travel.viewer.expandAll') : t('travel.viewer.collapseAll') }}
            </el-button>
          </div>

          <div
            v-for="day in board"
            :key="day.n"
            class="day-group"
            :class="{ 'drop-target': dropTarget === `day-${day.n}` && draggingKey, 'day-group--empty': day.items.length === 0 }"
            @dragover="onDragOver($event, `day-${day.n}`)"
            @dragleave="dropTarget = null"
            @drop="onDrop($event, day.n)"
          >
            <div class="day-group-header" @click="toggleDayCollapsed(day.n)">
              <div class="day-badge">{{ day.n }}</div>
              <div class="day-label">{{ dayLabel(day.n) }}</div>
              <span v-if="startKey" class="day-sub">{{ t('travel.planner.dayN', { n: day.n }) }}</span>
              <span class="day-item-count" v-if="collapsed.has(day.n) && day.items.length">{{ day.items.length }} {{ day.items.length === 1 ? t('travel.viewer.item') : t('travel.viewer.items') }}</span>
              <span class="day-chevron">{{ collapsed.has(day.n) ? '›' : '⌄' }}</span>
            </div>

            <div v-show="!collapsed.has(day.n)" class="day-body">
              <div v-if="day.items.length === 0 && !draggingKey" class="day-empty">{{ t('travel.planner.emptyDay') }}</div>
              <div v-if="draggingKey && day.items.length === 0" class="day-drop-hint">{{ t('travel.planner.dropHere') }}</div>

              <div class="agenda-cards">
                <div
                  v-for="item in day.items"
                  :key="itemKey(item)"
                  class="agenda-card"
                  :class="{ dragging: draggingKey === itemKey(item) }"
                  draggable="true"
                  @dragstart="onDragStart($event, item)"
                  @dragend="onDragEnd"
                  @click="openEditDrawer(item)"
                >
                  <div class="card-icon"><TravelIcon :svg="getCategoryIcon(item.category)" /></div>
                  <div class="card-body">
                    <div class="card-title">{{ item.title || t('travel.viewer.untitled') }}</div>
                    <div v-if="getCardTime(item) || getCardCity(item) || item.budget" class="card-meta">
                      <span v-if="getCardTime(item)" class="card-time">{{ getCardTime(item) }}</span>
                      <span v-if="getCardCity(item)" class="card-city"><template v-if="getCardTime(item)"> · </template>{{ getCardCity(item) }}</span>
                      <template v-if="item.budget">
                        <span class="card-sep" v-if="getCardTime(item) || getCardCity(item)"> · </span>
                        <span class="card-budget"><el-icon><Money /></el-icon> {{ item.budget.toLocaleString() }}</span>
                      </template>
                    </div>
                    <div v-if="item.desc" class="card-notes">{{ item.desc }}</div>
                    <div v-if="cardImages(item).length" class="card-images">
                      <el-image
                        v-for="(file, fi) in cardImages(item)"
                        :key="file.uuid ?? fi"
                        :src="fileBlobs.get(file.uuid)"
                        :preview-src-list="cardImages(item).map((f: any) => fileBlobs.get(f.uuid)).filter(Boolean)"
                        :initial-index="fi"
                        fit="cover"
                        class="card-image-thumb"
                        preview-teleported
                        @click.stop
                      />
                    </div>
                    <div v-else-if="(item.files ?? []).length" class="card-photo-chip">
                      <el-icon><Camera /></el-icon> {{ t('travel.planner.photoCount', item.files!.length) }}
                    </div>
                  </div>
                  <div class="card-actions" @click.stop>
                    <DayChipMenu :day="day.n" :day-count="dayCount" :start-key="startKey" @select="(d) => scheduleItem(item, d)" />
                    <el-button circle size="small" :title="t('travel.planner.editTooltip')" @click="openEditDrawer(item)">
                      <el-icon style="font-size:0.72rem"><Edit /></el-icon>
                    </el-button>
                    <el-button circle size="small" :title="t('travel.planner.deleteTooltip')" @click="removeAgendaItem(item)">
                      <el-icon style="font-size:0.72rem"><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>

              <QuickAddInput :placeholder="t('travel.planner.quickAddToDay', { n: day.n })" :maxlength="AGENDA_TITLE_MAX_LENGTH" compact @submit="(text) => quickAddToDay(day.n, text)" />
            </div>
          </div>

          <!-- Dated items that fall outside the trip's current dates -->
          <div v-if="outsideItems.length" class="day-group day-group--outside">
            <div class="day-group-header day-group-header--static">
              <div class="day-badge day-badge--muted">!</div>
              <div class="day-label">{{ t('travel.planner.outsideDates') }}</div>
            </div>
            <div class="agenda-cards">
              <div v-for="item in outsideItems" :key="itemKey(item)" class="agenda-card" @click="openEditDrawer(item)">
                <div class="card-icon"><TravelIcon :svg="getCategoryIcon(item.category)" /></div>
                <div class="card-body">
                  <div class="card-title">{{ item.title || t('travel.viewer.untitled') }}</div>
                  <div class="card-meta"><span class="card-time">{{ item.date }}</span></div>
                </div>
                <div class="card-actions" @click.stop>
                  <DayChipMenu :day="undefined" :day-count="dayCount" :start-key="startKey" @select="(d) => scheduleItem(item, d)" />
                  <el-button circle size="small" @click="removeAgendaItem(item)"><el-icon style="font-size:0.72rem"><Delete /></el-icon></el-button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- ── PACKING ───────────────────────────────────────────────────── -->
      <div v-else-if="activeTab === 'packing'" class="tab-panel" :class="{ 'drop-active': draggingPacking }" @dragover.prevent @drop="onDropPacking($event)">
        <PackingSuggestionPanel @add="onPackingAdd" @drag-start="draggingPacking = true" @drag-end="draggingPacking = false" />

        <div class="packing-progress" v-if="packingList.length > 0">
          <div class="packing-progress-label">{{ t('travel.packing.progress', { packed: packingPackedCount, total: packingList.length }) }}</div>
          <div class="packing-progress-bar">
            <div class="packing-progress-fill" :style="{ width: (packingPackedCount / packingList.length * 100) + '%' }" />
          </div>
        </div>

        <div v-if="packingList.length === 0" class="list-empty">{{ t('travel.packing.noItems') }}</div>
        <div v-else class="packing-categories">
          <div v-for="group in packingItemsByCategory" :key="group.cat.key" class="packing-category-group">
            <div class="packing-cat-heading"><TravelIcon :svg="group.cat.icon" /> {{ t(group.cat.labelKey) }}</div>
            <div class="packing-item" v-for="item in group.items" :key="item._localIndex ?? item.id">
              <button class="packing-check" :class="{ 'packing-check--packed': item.packed }" type="button" @click="togglePackingItem(item)">
                <el-icon v-if="item.packed"><Check /></el-icon>
              </button>
              <span class="packing-item-label" :class="{ 'packing-item-label--packed': item.packed }">{{ item.label }}</span>
              <span v-if="item.quantity" class="packing-qty">×{{ item.quantity }}</span>
              <div class="packing-item-actions">
                <el-button circle size="small" @click="openEditPackingDrawer(item)"><el-icon style="font-size:0.72rem"><Edit /></el-icon></el-button>
                <el-button circle size="small" @click="removePackingItem(item)"><el-icon style="font-size:0.72rem"><Delete /></el-icon></el-button>
              </div>
            </div>
          </div>
        </div>

        <QuickAddInput :placeholder="t('travel.planner.quickAddPacking')" :maxlength="PACKING_LABEL_MAX_LENGTH" @submit="quickAddPacking" />
      </div>

      <!-- ── NOTES ─────────────────────────────────────────────────────── -->
      <div v-else-if="activeTab === 'notes'" class="tab-panel">
        <NoteSuggestionPanel :country="itinerary.country" @add="onNoteAdd" />

        <div v-if="noteItemsList.length === 0" class="list-empty">{{ t('travel.note.noItems') }}</div>
        <div v-else class="packing-categories">
          <div class="packing-item" v-for="item in noteItemsList" :key="item._localIndex ?? item.id">
            <button class="packing-check" :class="{ 'packing-check--packed': item.done }" type="button" @click="toggleNoteItem(item)">
              <el-icon v-if="item.done"><Check /></el-icon>
            </button>
            <span class="packing-item-label" :class="{ 'packing-item-label--packed': item.done }">{{ item.label }}</span>
            <a v-if="item.url" :href="item.url" target="_blank" rel="noopener" class="note-item-link"><el-icon><Link /></el-icon></a>
            <div class="packing-item-actions">
              <el-button circle size="small" @click="removeNoteItem(item)"><el-icon style="font-size:0.72rem"><Delete /></el-icon></el-button>
            </div>
          </div>
        </div>

        <QuickAddInput :placeholder="t('travel.planner.quickAddNote')" :maxlength="NOTE_LABEL_MAX_LENGTH" @submit="quickAddNote" />
      </div>

    </div><!-- end .planner-content -->

    <!-- Map panel: side pane on desktop, replaces the content on phones -->
    <div v-show="showMap" class="planner-map-panel" :class="{ 'planner-map-panel--fullscreen': isMapFullscreen }">
      <TravelMapView
        :agenda-items="agendaItems"
        :start-key="startKey"
        :fullscreen="isMapFullscreen"
        @toggle-fullscreen="isMapFullscreen = !isMapFullscreen"
      />
    </div>

    </div><!-- end .planner-layout -->

    </template>
  </div>

  <!-- Phone-only floating bar, sitting above the bottom tab bar -->
  <Teleport to="body">
    <div v-if="isMobile && (isAuthenticated || isDraft)" class="mobile-fab-bar">
      <el-button type="primary" size="small" round @click="openAddDrawer(undefined, 'todo')">
        <el-icon><Plus /></el-icon> {{ t('travel.planner.addItemFab') }}
      </el-button>
      <template v-if="hasGeo">
        <span class="fab-divider"></span>
        <el-button size="small" round :type="showMap ? 'primary' : 'default'" plain @click="mapOpen = !mapOpen">
          <el-icon><MapLocation /></el-icon> {{ t('travel.planner.map') }}
        </el-button>
      </template>
    </div>
  </Teleport>

  <TravelShareDialog
    v-model="shareOpen"
    :short-code="itinerary.shortCode"
    :challenge="itinerary.challenge"
    :is-draft="isDraft"
    @update:challenge="onChallengeChange"
    @login="layoutStore.loginDialog.setTrue()"
  />

  <AgendaDrawer
    v-model="drawerVisible"
    :item="drawerItem"
    :is-new="drawerIsNew"
    :drawer-direction="drawerDirection"
    :drawer-size="drawerSize"
    :day-count="dayCount"
    :start-key="startKey"
    :allow-images="!isDraft"
    @save="onDrawerSave"
    @sync="onDrawerSync"
    @uploading="(v: boolean) => (drawerUploading = v)"
  />

  <PackingDrawer
    v-model="packingDrawerVisible"
    :item="packingDrawerItem"
    :is-new="packingDrawerIsNew"
    :drawer-direction="drawerDirection"
    :drawer-size="drawerSize"
    @save="onPackingDrawerSave"
    @cancel="packingDrawerVisible = false"
  />
</template>

<style scoped>
.planner-view {
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  width: 100%;
  height: 100%;
  justify-self: center;
  box-sizing: border-box;
}

/* ── Topbar ── */
.planner-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  gap: 8px;
}

.back-btn {
  font-size: 0.85rem;
  color: var(--color-text);
  padding: 0;
}

.planner-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.save-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text);
  opacity: 0.7;
  cursor: default;
  white-space: nowrap;
}

.save-chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.save-chip--pending { color: var(--el-color-warning); opacity: 1; cursor: pointer; }
.save-chip--saving { color: var(--color-text); }
.save-chip--saving .save-chip-dot { animation: pulse 0.9s ease-in-out infinite; }
.save-chip--saved { color: var(--el-color-success); opacity: 1; }
.save-chip--error { color: var(--el-color-danger); opacity: 1; cursor: pointer; border-color: color-mix(in srgb, var(--el-color-danger) 40%, transparent); }

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

/* ── Trip header ── */
.planner-header {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.title-input :deep(.el-input__wrapper) {
  box-shadow: none;
  padding: 0;
  background: transparent;
}

.title-input :deep(.el-input__inner) {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-heading);
  height: auto;
  padding: 0;
}

.header-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.meta-destination { width: 200px; }
.meta-dates { max-width: 260px; }

.meta-days {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-days :deep(.el-input-number) { width: 96px; }

.meta-days-label {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.6;
}

/* ── Tabs ── */
.planner-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--color-border);
  overflow-x: auto;
}

.planner-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 14px;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;
  color: var(--color-text);
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  opacity: 0.7;
  transition: opacity 0.12s, border-color 0.12s;
}

.planner-tab:hover { opacity: 1; }

.planner-tab--active {
  opacity: 1;
  color: var(--el-color-primary);
  border-bottom-color: var(--el-color-primary);
}

.planner-tab-icon {
  display: inline-flex;
  width: 16px;
  height: 16px;
}

.planner-tab-count {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--el-fill-color, #f0f0f0);
  color: var(--color-text);
  font-size: 0.68rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.planner-tab--active .planner-tab-count {
  background: var(--el-color-primary);
  color: #fff;
}

.planner-loading { padding: 20px 0; }

/* ── Layout ── */
.planner-layout {
  display: flex;
  gap: 16px;
  flex: 1;
  align-items: flex-start;
  min-height: 0;
}

.planner-content {
  flex: 1;
  min-width: 0;
}

.planner-map-panel {
  width: 380px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  position: sticky;
  top: 16px;
  height: calc(100vh - 220px);
  min-height: 400px;
}

.planner-map-panel--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 2000;
  width: 100% !important;
  height: 100% !important;
  border-radius: 0 !important;
  border: none !important;
}

/* ── Plan grid ── */
.plan-grid {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.plan-grid--with-map {
  grid-template-columns: 240px minmax(0, 1fr);
}

.ideas-tray {
  position: sticky;
  top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  background: var(--color-background-soft);
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  transition: border-color 0.12s, background 0.12s;
}

.ideas-head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ideas-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
  display: flex;
  align-items: center;
  gap: 6px;
}

.ideas-count {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 9px;
  background: var(--el-color-primary);
  color: #fff;
}

.ideas-filters {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.filter-pill {
  padding: 3px 9px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.filter-pill.active {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
}

.ideas-hint {
  margin: 0;
  font-size: 0.74rem;
  color: var(--color-text);
  opacity: 0.55;
  line-height: 1.4;
}

.ideas-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.idea-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  cursor: grab;
  transition: background 0.12s, opacity 0.12s;
}

.idea-card:hover { background: var(--color-background-mute); }
.idea-card.dragging { opacity: 0.4; }

.idea-icon { flex-shrink: 0; font-size: 1.1rem; }

.idea-body { flex: 1; min-width: 0; }

.idea-title {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.idea-city {
  font-size: 0.72rem;
  opacity: 0.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.idea-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}

.details-link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  padding: 0;
  font-size: 0.76rem;
  color: var(--el-color-primary);
  cursor: pointer;
  opacity: 0.85;
}

.details-link:hover { opacity: 1; text-decoration: underline; }

/* ── Day board ── */
.day-board {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px 18px 18px;
  background: var(--color-background);
}

.board-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.board-summary {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.6;
}

.day-group {
  margin-bottom: 22px;
  border-radius: 10px;
  transition: background 0.12s, box-shadow 0.12s;
}

.day-group.drop-target,
.ideas-tray.drop-target {
  background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary) 45%, transparent);
}

.day-group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  padding-bottom: 10px;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid var(--color-border);
}

.day-group-header--static { cursor: default; }

.day-group-header:hover .day-label { color: var(--el-color-primary); }

.day-badge {
  width: 26px;
  height: 26px;
  border-radius: 60% 40% 55% 45% / 45% 55% 40% 60%;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--el-color-primary) 14%, transparent);
}

.day-badge--muted { background: var(--el-color-warning); box-shadow: none; }

.day-label {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-heading);
}

.day-sub,
.day-item-count {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.45;
}

.day-chevron {
  margin-left: auto;
  font-size: 1rem;
  color: var(--color-text);
  opacity: 0.4;
  line-height: 1;
}

.day-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.day-empty,
.day-drop-hint {
  font-size: 0.76rem;
  color: var(--color-text);
  opacity: 0.45;
  padding: 2px 2px 0;
}

.day-drop-hint {
  opacity: 0.8;
  color: var(--el-color-primary);
  border: 1px dashed var(--el-color-primary);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
}

.agenda-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.agenda-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  cursor: pointer;
  transition: background 0.12s, opacity 0.12s;
}

.agenda-card:hover { background: var(--color-background-mute); }
.agenda-card.dragging { opacity: 0.4; }

.card-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
  width: 32px;
  text-align: center;
  padding-top: 1px;
}

.card-body { flex: 1; min-width: 0; }

.card-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
  line-height: 1.35;
}

.card-meta {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.65;
  margin-top: 3px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.card-time { color: var(--el-color-primary); font-weight: 600; opacity: 1; }
.card-city { opacity: 0.8; }
.card-sep { opacity: 0.4; }
.card-budget { color: var(--color-text); }

.card-notes {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.5;
  margin-top: 4px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.45;
}

.card-images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.card-image-thumb {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  cursor: zoom-in;
  flex-shrink: 0;
}

.card-image-thumb :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-photo-chip {
  font-size: 0.72rem;
  color: var(--color-text-secondary, #888);
  margin-top: 6px;
}

.card-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}

/* ── Generic tab panel (packing / notes) ── */
.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px 18px 18px;
  background: var(--color-background);
}

.list-empty {
  padding: 18px 12px;
  font-size: 13px;
  color: var(--color-text);
  opacity: 0.6;
  text-align: center;
}

/* ── Auth gate ── */
.planner-auth-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 0;
}

.auth-gate-icon { font-size: 2.4rem; }

.auth-gate-text {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.6;
}

/* ── Phone floating bar ── */
.mobile-fab-bar {
  position: fixed;
  bottom: calc(var(--tabbar-h, 0px) + 12px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  padding: 6px 10px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  z-index: 100;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
}

.fab-divider {
  width: 1px;
  height: 16px;
  background: var(--color-border);
  align-self: center;
}

/* ── Draft banner ── */
.draft-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  margin-bottom: 14px;
  background: color-mix(in srgb, var(--el-color-warning) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--el-color-warning) 30%, transparent);
  border-radius: 8px;
  font-size: 0.83rem;
  color: var(--color-text);
}

/* ── Packing / notes lists ── */
.packing-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.packing-progress-label {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.65;
}

.packing-progress-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--color-border);
  overflow: hidden;
}

.packing-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--el-color-primary);
  transition: width 0.3s ease;
}

.packing-categories {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.packing-category-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.packing-cat-heading {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.4;
  padding: 4px 0;
}

.packing-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background-soft);
}

.packing-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.packing-check--packed {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
}

.packing-item-label {
  flex: 1;
  font-size: 0.9rem;
  color: var(--color-text);
}

.packing-item-label--packed {
  text-decoration: line-through;
  opacity: 0.45;
}

.packing-qty {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.55;
  background: var(--color-background-mute);
  padding: 2px 7px;
  border-radius: 10px;
}

.packing-item-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.packing-item:hover .packing-item-actions,
.packing-item:focus-within .packing-item-actions { opacity: 1; }

.note-item-link {
  display: inline-flex;
  color: var(--el-color-primary);
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .planner-layout { display: block; }

  .planner-map-panel {
    width: 100%;
    position: static;
    height: calc(100vh - 240px);
    min-height: 320px;
    border-radius: 10px;
  }

  .plan-grid,
  .plan-grid--with-map { grid-template-columns: 1fr; }

  .ideas-tray {
    position: static;
    max-height: none;
  }
}

@media (max-width: 600px) {
  .planner-topbar { flex-wrap: wrap; }
  .planner-actions { width: 100%; gap: 6px; }
  .header-meta > * { width: 100% !important; max-width: none; }
  .meta-destination,
  .meta-dates { width: 100%; }
  .meta-days { justify-content: space-between; }
  .meta-days :deep(.el-input-number) { width: 120px; }
  .day-board,
  .tab-panel { padding: 12px; }
  /* Touch has no hover: keep row actions visible */
  .packing-item-actions { opacity: 1; }
  .title-input :deep(.el-input__inner) { font-size: 1.5rem; }
}
</style>
