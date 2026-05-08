import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { DateUtils } from '@/utilities/DateUtils'
import { ElMessage } from 'element-plus'
import HttpClient from '@/interceptors/HttpClient'
import type { Itinerary } from '@/interfaces/forms/itinerary/Itinerary'
import { ApiRoute } from '@/constants/ApiRoute'
import { ListUtils } from '@/utilities/ListUtils'
import type { AgendaItem } from '@/interfaces/forms/itinerary/AgendaItem'
import type { ItineraryBooking } from '@/interfaces/forms/itinerary/ItineraryBooking'
import type { PackingItem } from '@/interfaces/forms/itinerary/PackingItem'
import { GeneratorUtils } from '@/utilities/GeneratorUtils'

export const useItineraryStore = defineStore('itinerary', () => {
  const loadingStage = ref<'Storing Itinerary' | 'Uploading Files' | 'Completed' | ''>('')
  const itinerary = reactive<Itinerary>({
    id: undefined,
    idempotencyKey: '',
    sessionTitle: 'Untitled Travel',
    sessionId: '',
    unknownDate: false,
    durationInDays: 1,
    numberOfPax: 1,
    agendaItems: [],
    destinationRaw: [],
    _agendaIdsToDelete: [],
    _agendaIdsToUpdate: [],
    bookings: [],
    packingItems: [],
    paxNames: [],
    _bookingIdsToDelete: [],
    _packingIdsToDelete: [],
  })

  const resetItinerary = () => {
    itinerary.id = undefined
    itinerary.sessionTitle = 'Untitled Travel'
    itinerary.sessionId = ''
    itinerary.unknownDate = false
    itinerary.durationInDays = 1
    itinerary.numberOfPax = 1
    itinerary.agendaItems = []
    itinerary.destinationRaw = []
    itinerary.challenge = undefined
    itinerary._agendaIdsToDelete = []
    itinerary._agendaIdsToUpdate = []
    itinerary.bookings = []
    itinerary.packingItems = []
    itinerary.paxNames = []
    itinerary._bookingIdsToDelete = []
    itinerary._packingIdsToDelete = []
  }

  const createItinerary = async (): Promise<{
    isSuccess: boolean
    error: 'itinerary' | 'file' | 'auth' | undefined
    shortCode: string | undefined
  }> => {
    try {
      loadingStage.value = 'Storing Itinerary'
      const payload = {
        ...itinerary,
        destination:
          itinerary.destinationRaw?.length > 0
            ? ListUtils.joinWithDelimiter(itinerary.destinationRaw, '-')
            : itinerary.destination,
        agendaItems: itinerary.agendaItems.map((agendaItem) => ({
          ...agendaItem,
          files: [],
          _agendaToFileMapping: agendaItem.files.map((file: any) => ({
            uuid: file.uuid,
            tgShortCode: file.tgShortCode ?? file.tg_short_code,
          })),
          _filesToInsert: agendaItem._filesToInsert ?? [],
        })),
      }

      const response = await HttpClient.post(ApiRoute.ITINERARY.CREATE, payload)
        .then((res) => res)
        .catch((err) => err)

      if (response.status === 403 && response.response?.data?.message?.code === 'invalid-token') {
        return { isSuccess: false, error: 'auth', shortCode: undefined }
      }

      if (response.status !== 200) {
        return { isSuccess: false, error: 'itinerary', shortCode: undefined }
      }

      const { shortCode, agendaToFileMap } = response.data.data

      agendaToFileMap.forEach(({ agendaId }: { agendaId: number }, index: number) => {
        if (itinerary.agendaItems[index]) {
          itinerary.agendaItems[index].id = String(agendaId)
          itinerary.agendaItems[index]._isDirty = false
          itinerary.agendaItems[index]._filesToInsert = []
          itinerary.agendaItems[index]._fileIdsToDelete = []
          itinerary.agendaItems[index]._agendaToFileMapping = []
        }
      })

      loadingStage.value = 'Completed'
      return { isSuccess: true, error: undefined, shortCode }
    } catch {
      return { isSuccess: false, error: 'itinerary', shortCode: undefined }
    }
  }

  const updateItinerary = async (): Promise<{
    isSuccess: boolean
    error: 'itinerary' | 'file' | 'auth' | undefined
    shortCode: string | undefined
  }> => {
    try {
      const payload = {
        ...itinerary,
        destination:
          itinerary.destinationRaw?.length > 0
            ? ListUtils.joinWithDelimiter(itinerary.destinationRaw, '-')
            : itinerary.destination,
        agendaItems: itinerary.agendaItems.map((agendaItem) => ({
          ...agendaItem,
          files: [],
          _agendaToFileMapping: agendaItem.files.map((file: any) => ({
            uuid: file.uuid,
            tgShortCode: file.tgShortCode ?? file.tg_short_code,
          })),
          _filesToInsert: agendaItem._filesToInsert ?? [],
        })),
      }

      // Handle file deletions
      const deleteResponses = await Promise.all(
        payload.agendaItems
          .filter((agendaItem) => agendaItem._fileIdsToDelete?.length)
          .map((agendaItem) =>
            HttpClient.post(ApiRoute.FILE.DELETE, {
              _fileIdsToDelete: agendaItem._fileIdsToDelete,
            })
              .then((res) => {
                return res
              })
              .catch((err) => {
                return err
              }),
          ),
      )

      // Check for auth errors in deletions
      const authErrorInDeletions = deleteResponses.some(
        (response) =>
          response?.status === 403 && response?.response?.data?.message?.code === 'invalid-token',
      )
      if (authErrorInDeletions) {
        return { isSuccess: false, error: 'auth', shortCode: undefined }
      }

      // Update itinerary
      const response = await HttpClient.post(
        `${ApiRoute.ITINERARY.MODIFY}/${itinerary.sessionId}`,
        payload,
      )
        .then((res) => {
          return res
        })
        .catch((err) => {
          return err
        })

      // Handle JWT expiration
      if (response.status === 403 && response.response?.data?.message?.code === 'invalid-token') {
        return { isSuccess: false, error: 'auth', shortCode: undefined }
      }

      if (response.status !== 200) {
        return { isSuccess: false, error: 'itinerary', shortCode: undefined }
      }

      const { agendaToFileMap, shortCode } = response.data.data

      agendaToFileMap.forEach(({ agendaId }: { agendaId: number }, index: number) => {
        if (itinerary.agendaItems[index]) {
          itinerary.agendaItems[index].id = String(agendaId)
          itinerary.agendaItems[index]._isDirty = false
          itinerary.agendaItems[index]._filesToInsert = []
          itinerary.agendaItems[index]._fileIdsToDelete = []
          itinerary.agendaItems[index]._agendaToFileMapping = []
        }
      })

      return { isSuccess: true, error: undefined, shortCode }
    } catch (error: unknown) {
      console.error('Error updating itinerary:', error)

      // Handle "Auth required" case
      if (error instanceof Error && error.message === 'Auth required') {
        return { isSuccess: false, error: 'auth', shortCode: undefined }
      }

      // Type guard for Axios-style error
      const isAxiosError = (
        err: unknown,
      ): err is { response?: { data?: { shortCode?: string } } } => {
        return typeof err === 'object' && err !== null && 'response' in err
      }

      // Extract shortCode safely
      const shortCode = isAxiosError(error) ? error.response?.data?.shortCode : undefined

      return {
        isSuccess: false,
        error: shortCode ? 'file' : 'itinerary',
        shortCode: shortCode || undefined,
      }
    }
  }

  const addAgendaItemToItinerary = async (agendaItem: AgendaItem) => {
    itinerary.agendaItems?.push({ ...agendaItem, _localIndex: new Date().getTime().toString() })
  }

  const getLimitForFileUpload = () => 2
  const setSessionId = (sessionId: string) => (itinerary.sessionId = sessionId)
  const onItineraryDateSelection = (dates: string[]) => {
    if (dates.length !== 2) return
    itinerary.itineraryDateRaw = dates
    itinerary.startDate = new Date(dates[0]).getTime()
    itinerary.endDate = new Date(dates[1]).getTime()
    itinerary.durationInDays = DateUtils.calculateDurationInDays(
      new Date(itinerary.startDate),
      new Date(itinerary.endDate),
      true,
    )
  }
  const removeAgendaItem = (item: AgendaItem) => {
    const index = itinerary.agendaItems.findIndex((i) => i.id === item.id)

    if (index !== -1) {
      if (itinerary.agendaItems[index].id !== undefined) {
        itinerary._agendaIdsToDelete?.push(itinerary.agendaItems[index].id)
      }
      itinerary.agendaItems.splice(index, 1)
    }
  }

  const onUnknownDateToggle = () => {
    if (!itinerary.unknownDate && itinerary.startDate && itinerary.endDate) {
      const newDays = DateUtils.calculateDurationInDays(
        new Date(itinerary.startDate),
        new Date(itinerary.endDate),
        true,
      )

      if (newDays !== itinerary.durationInDays) {
        const differenceInDays = newDays - itinerary.durationInDays
        itinerary.durationInDays = newDays
        if (differenceInDays < 0) {
          ElMessage({
            message: `There is a difference of ${differenceInDays} days. Any existing activities will have to be rescheduled.`,
            type: 'warning',
            plain: false,
            duration: 6000,
          })
        }
      }
    }
  }

  const addBooking = (booking: ItineraryBooking) => {
    itinerary.bookings.push({ ...booking, _localIndex: `booking-${Date.now()}` })
  }

  const removeBooking = (booking: ItineraryBooking) => {
    const index = itinerary.bookings.findIndex(
      (b) => b._localIndex === booking._localIndex || (b.id && b.id === booking.id),
    )
    if (index !== -1) {
      if (itinerary.bookings[index].id !== undefined) {
        itinerary._bookingIdsToDelete?.push(itinerary.bookings[index].id!)
      }
      itinerary.bookings.splice(index, 1)
    }
  }

  const addPackingItem = (item: PackingItem) => {
    itinerary.packingItems.push({ ...item, _localIndex: `packing-${Date.now()}` })
  }

  const removePackingItem = (item: PackingItem) => {
    const index = itinerary.packingItems.findIndex(
      (p) => p._localIndex === item._localIndex || (p.id && p.id === item.id),
    )
    if (index !== -1) {
      if (itinerary.packingItems[index].id !== undefined) {
        itinerary._packingIdsToDelete?.push(itinerary.packingItems[index].id!)
      }
      itinerary.packingItems.splice(index, 1)
    }
  }

  const updatePackingItem = (updated: PackingItem) => {
    const index = itinerary.packingItems.findIndex(
      (p) => p._localIndex === updated._localIndex || (p.id && p.id === updated.id),
    )
    if (index !== -1) itinerary.packingItems.splice(index, 1, updated)
  }

  const togglePackingItem = (item: PackingItem) => {
    updatePackingItem({ ...item, packed: !item.packed })
  }

  const DRAFT_KEY = 'fndom-draft-itinerary'

  const saveDraft = () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        sessionTitle: itinerary.sessionTitle,
        destination: itinerary.destination,
        destinationRaw: itinerary.destinationRaw,
        numberOfPax: itinerary.numberOfPax,
        unknownDate: itinerary.unknownDate,
        durationInDays: itinerary.durationInDays,
        itineraryDateRaw: itinerary.itineraryDateRaw,
        startDate: itinerary.startDate,
        endDate: itinerary.endDate,
        agendaItems: itinerary.agendaItems,
        bookings: itinerary.bookings,
        packingItems: itinerary.packingItems,
      }),
    )
  }

  const loadDraft = (): boolean => {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return false
    try {
      const d = JSON.parse(raw)
      Object.assign(itinerary, d)
      itinerary._agendaIdsToDelete = []
      itinerary._bookingIdsToDelete = []
      itinerary._packingIdsToDelete = []
      return true
    } catch {
      return false
    }
  }

  const clearDraft = () => localStorage.removeItem(DRAFT_KEY)

  const migrateDraft = async (): Promise<string | null> => {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    try {
      const d = JSON.parse(raw)
      const res = await HttpClient.post(ApiRoute.ITINERARY.CREATE, {
        ...d,
        idempotencyKey: GeneratorUtils.generateUUID(),
      }).catch(() => null)
      const sessionId = res?.data?.data?.sessionId
      if (sessionId) {
        clearDraft()
        return sessionId
      }
      return null
    } catch {
      return null
    }
  }

  const updateBooking = (updatedBooking: ItineraryBooking) => {
    const index = itinerary.bookings.findIndex(
      (b) => b._localIndex === updatedBooking._localIndex || (b.id && b.id === updatedBooking.id),
    )
    if (index !== -1) {
      itinerary.bookings.splice(index, 1, updatedBooking)
    }
  }

  const updateAgendaItem = (updatedItem: AgendaItem) => {
    if (updatedItem.id) {
      itinerary._agendaIdsToUpdate?.push(updatedItem.id)
    }
    const index = itinerary.agendaItems.findIndex((i) => {
      return i._localIndex === updatedItem._localIndex
    })

    if (index !== -1) {
      itinerary.agendaItems.splice(index, 1, updatedItem)
      if (updatedItem.id) {
        itinerary.agendaItems[index]._isDirty = true
      }
    }
  }

  const retrieveItinerary = async (sessionId: string | undefined) => {
    return await HttpClient.get(`${ApiRoute.ITINERARY.RETRIEVE_BY_ID(sessionId)}`)
      .then((res) => {
        return res.data.data
      })
      .catch((err) => {
        if (err.response?.status === 403) throw err
        console.error('Error: ', err)
        return null
      })
  }

  const retrieveItineraryForUpdate = async (
    sessionId: string | undefined,
  ): Promise<{ success: boolean; forbidden: boolean }> => {
    if (sessionId === undefined) return { success: false, forbidden: false }
    try {
      const retrievedItinerary = await retrieveItinerary(sessionId)
      const clonedRetrievedItinerary = { ...retrievedItinerary }
      itinerary.id = clonedRetrievedItinerary.id
      itinerary.sessionId = clonedRetrievedItinerary.sessionId
      itinerary.sessionTitle = clonedRetrievedItinerary.sessionTitle
      itinerary.unknownDate = clonedRetrievedItinerary.unknownDate
      itinerary.durationInDays = clonedRetrievedItinerary.durationInDays
      itinerary.numberOfPax = clonedRetrievedItinerary.numberOfPax
      itinerary.agendaItems = (clonedRetrievedItinerary.agendaItems ?? []).map((item: any) => ({
        ...item,
        files: item.files ?? [],
        _fileIdsToDelete: [],
        _filesToInsert: [],
        _agendaToFileMapping: [],
      }))
      itinerary.destinationRaw = clonedRetrievedItinerary.destinationRaw
        ? JSON.parse(clonedRetrievedItinerary.destinationRaw)
        : undefined
      itinerary.itineraryDateRaw = clonedRetrievedItinerary.itineraryDateRaw
        ? JSON.parse(clonedRetrievedItinerary.itineraryDateRaw)
        : undefined
      itinerary.startDate = clonedRetrievedItinerary.itineraryDateRaw
        ? clonedRetrievedItinerary.startDate
        : undefined
      itinerary.endDate = clonedRetrievedItinerary.itineraryDateRaw
        ? clonedRetrievedItinerary.endDate
        : undefined
      itinerary.shortCode = clonedRetrievedItinerary.shortCode
      itinerary.challenge = clonedRetrievedItinerary.challenge
      itinerary.bookings = clonedRetrievedItinerary.bookings ?? []
      itinerary.packingItems = clonedRetrievedItinerary.packingItems ?? []
      itinerary.paxNames = clonedRetrievedItinerary.paxNames ?? []
      itinerary._bookingIdsToDelete = []
      itinerary._packingIdsToDelete = []
      return { success: true, forbidden: false }
    } catch (err: any) {
      if (err.response?.status === 403) return { success: false, forbidden: true }
      return { success: false, forbidden: false }
    }
  }

  return {
    loadingStage,
    itinerary,
    setSessionId,
    getLimitForFileUpload,
    createItinerary,
    retrieveItinerary,
    resetItinerary,
    retrieveItineraryForUpdate,
    updateItinerary,
    addAgendaItemToItinerary,
    onItineraryDateSelection,
    removeAgendaItem,
    onUnknownDateToggle,
    updateAgendaItem,
    addBooking,
    removeBooking,
    updateBooking,
    addPackingItem,
    removePackingItem,
    updatePackingItem,
    togglePackingItem,
    saveDraft,
    loadDraft,
    clearDraft,
    migrateDraft,
  }
})
