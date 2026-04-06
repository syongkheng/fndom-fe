<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useNav } from '@/hooks/useNav'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useAuthenticationStore } from '@/stores/authentication'
import { storeToRefs } from 'pinia'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { GeneratorUtils } from '@/utilities/GeneratorUtils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'

const nav = useNav()
const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const { isAuthenticated } = storeToRefs(authStore)

const { t } = useI18n()

interface TripCard {
  id: number
  sessionId: string
  sessionTitle: string
  destination?: string
  startDate?: number
  endDate?: number
  numberOfPax?: number
  shortCode?: string
}

const myTrips = ref<TripCard[]>([])
const sharedTrips = ref<TripCard[]>([])
const loading = ref(false)
const showNewTripDialog = ref(false)
const creating = ref(false)

const newTrip = ref({
  sessionTitle: '',
  destination: '',
  dateRange: [] as string[],
  numberOfPax: 1,
})

const fetchTrips = async () => {
  loading.value = true
  const res = await HttpClient.get(ApiRoute.ITINERARY.GET_ALL).catch(() => null)
  if (res?.data?.data) {
    myTrips.value = res.data.data.myTrips ?? []
    sharedTrips.value = res.data.data.sharedTrips ?? []
  }
  loading.value = false
}

onMounted(() => {
  if (!isAuthenticated.value) {
    layoutStore.loginDialog.setTrue()
    return
  }
  fetchTrips()
})

watch(isAuthenticated, (val) => {
  if (val) fetchTrips()
})

const formatDateRange = (startDate?: number, endDate?: number) => {
  if (!startDate) return t('travel.list.datesTbc')
  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return endDate ? `${fmt(startDate)} – ${fmt(endDate)}` : fmt(startDate)
}

const openNewTripDialog = () => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  newTrip.value = { sessionTitle: '', destination: '', dateRange: [], numberOfPax: 1 }
  showNewTripDialog.value = true
}

const handleCreate = async () => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  if (!newTrip.value.sessionTitle.trim()) {
    ElMessage.warning(t('travel.list.noTitle'))
    return
  }
  creating.value = true
  const payload = {
    idempotencyKey: GeneratorUtils.generateUUID(),
    sessionTitle: newTrip.value.sessionTitle.trim(),
    destination: newTrip.value.destination.trim() || undefined,
    destinationRaw: [],
    numberOfPax: newTrip.value.numberOfPax,
    itineraryDateRaw: newTrip.value.dateRange.length === 2 ? newTrip.value.dateRange : undefined,
    startDate: newTrip.value.dateRange[0] ? new Date(newTrip.value.dateRange[0]).getTime() : undefined,
    endDate: newTrip.value.dateRange[1] ? new Date(newTrip.value.dateRange[1]).getTime() : undefined,
    durationInDays: 1,
    unknownDate: newTrip.value.dateRange.length === 0,
    agendaItems: [],
    _agendaIdsToDelete: [],
    _agendaIdsToUpdate: [],
  }

  const res = await HttpClient.post(ApiRoute.ITINERARY.CREATE, payload).catch(() => null)
  creating.value = false

  if (!res?.data?.data?.sessionId) {
    ElMessage.error(t('travel.list.failed'))
    return
  }

  showNewTripDialog.value = false
  nav.redirectTo(`/travel/${res.data.data.sessionId}`)
}

const copyShareLink = (shortCode: string) => {
  const url = `${window.location.origin}/travel/v/${shortCode}`
  navigator.clipboard.writeText(url)
  ElMessage.success(t('travel.list.linkCopied'))
}

const confirmDelete = (trip: TripCard) => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  ElMessageBox.confirm(t('travel.list.deleteConfirm', { title: trip.sessionTitle }), t('travel.list.deleteTitle'), {
    confirmButtonText: t('travel.list.delete'),
    cancelButtonText: t('travel.list.cancel'),
    type: 'warning',
    confirmButtonClass: 'el-button--danger',
  }).then(() => deleteTrip(trip.sessionId)).catch(() => {})
}

const deleteTrip = async (sessionId: string) => {
  const res = await HttpClient.post(ApiRoute.ITINERARY.DELETE(sessionId), {}).catch(() => null)
  if (!res?.data?.data?.deleted) {
    ElMessage.error(t('travel.list.failedDelete'))
    return
  }
  myTrips.value = myTrips.value.filter((t) => t.sessionId !== sessionId)
  ElMessage.success(t('travel.list.deleted'))
}
</script>

<template>
  <div class="page-container">

    <!-- Auth gate -->
    <div v-if="!isAuthenticated" class="auth-gate">
      <div class="auth-gate-icon">🔒</div>
      <p class="auth-gate-text">{{ t('travel.list.loginPrompt') }}</p>
      <el-button type="primary" @click="layoutStore.loginDialog.setTrue()">{{ t('travel.list.login') }}</el-button>
    </div>

    <template v-else>
    <header class="list-header">
      <div>
        <h1 class="list-title">{{ t('travel.list.title') }}</h1>
        <p class="list-subtitle">{{ t('travel.list.subtitle') }}</p>
      </div>
      <el-button type="primary" @click="openNewTripDialog">{{ t('travel.list.newTrip') }}</el-button>
    </header>

    <!-- My Trips -->
    <section class="trip-section">
      <h2 class="section-label">{{ t('travel.list.myTrips') }}</h2>

      <div v-if="loading" class="empty-state">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else-if="myTrips.length === 0" class="empty-state">
        <p class="empty-text">{{ t('travel.list.noTrips') }}</p>
      </div>

      <div v-else class="trip-grid">
        <div
          v-for="trip in myTrips"
          :key="trip.sessionId"
          class="trip-card"
          @click="nav.redirectTo(`/travel/${trip.sessionId}`)"
        >
          <div class="trip-card-body">
            <div class="trip-destination">{{ trip.destination || t('travel.list.destinationTbc') }}</div>
            <div class="trip-title">{{ trip.sessionTitle }}</div>
            <div class="trip-meta">
              <span>{{ formatDateRange(trip.startDate, trip.endDate) }}</span>
              <span v-if="trip.numberOfPax">· {{ t('travel.list.pax', { n: trip.numberOfPax }) }}</span>
            </div>
          </div>
          <div class="trip-card-actions" @click.stop>
            <el-tooltip :content="t('travel.list.viewTrip')" placement="top">
              <el-button
                v-if="trip.shortCode"
                circle
                size="small"
                @click="nav.redirectTo(`/travel/v/${trip.shortCode}`)"
              >
                <span style="font-size: 0.75rem">👁️</span>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="t('travel.list.copyLink')" placement="top">
              <el-button
                v-if="trip.shortCode"
                circle
                size="small"
                @click="copyShareLink(trip.shortCode!)"
              >
                <span style="font-size: 0.75rem">🔗</span>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="t('travel.list.deleteTrip')" placement="top">
              <el-button
                circle
                size="small"
                @click="confirmDelete(trip)"
              >
                <span style="font-size: 0.75rem">🗑️</span>
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </div>
    </section>

    <!-- Shared with Me -->
    <section class="trip-section">
      <h2 class="section-label">{{ t('travel.list.sharedWithMe') }}</h2>

      <div v-if="sharedTrips.length === 0" class="empty-state">
        <p class="empty-text">{{ t('travel.list.noShared') }}</p>
      </div>

      <div v-else class="trip-grid">
        <div
          v-for="trip in sharedTrips"
          :key="trip.sessionId"
          class="trip-card trip-card--shared"
          @click="nav.redirectTo(`/travel/${trip.sessionId}`)"
        >
          <div class="trip-card-body">
            <div class="trip-destination">{{ trip.destination || t('travel.list.destinationTbc') }}</div>
            <div class="trip-title">{{ trip.sessionTitle }}</div>
            <div class="trip-meta">
              <span>{{ formatDateRange(trip.startDate, trip.endDate) }}</span>
              <span v-if="trip.numberOfPax">· {{ t('travel.list.pax', { n: trip.numberOfPax }) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- New Trip Dialog -->
    <el-dialog v-model="showNewTripDialog" :title="t('travel.list.dialog.title')" width="420px" align-center>
      <div class="dialog-form">
        <label class="dlabel">{{ t('travel.list.dialog.tripTitle') }} <span class="req">*</span></label>
        <el-input v-model="newTrip.sessionTitle" :placeholder="t('travel.list.dialog.tripTitlePlaceholder')" size="large" />

        <label class="dlabel">{{ t('travel.list.dialog.destination') }}</label>
        <el-input v-model="newTrip.destination" :placeholder="t('travel.list.dialog.destinationPlaceholder')" size="large" />

        <label class="dlabel">{{ t('travel.list.dialog.travelDates') }}</label>
        <el-date-picker
          v-model="newTrip.dateRange"
          type="daterange"
          :range-separator="t('travel.list.dialog.to')"
          :start-placeholder="t('travel.list.dialog.startDate')"
          :end-placeholder="t('travel.list.dialog.endDate')"
          style="width: 100%"
          size="large"
          value-format="YYYY-MM-DD"
        />

        <label class="dlabel">{{ t('travel.list.dialog.numberOfTravellers') }}</label>
        <el-input-number v-model="newTrip.numberOfPax" :min="1" style="width: 100%" size="large" />
      </div>

      <template #footer>
        <el-button @click="showNewTripDialog = false">{{ t('travel.list.cancel') }}</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">{{ t('travel.list.createTrip') }}</el-button>
      </template>
    </el-dialog>

    </template>
  </div>
</template>

<style scoped>
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
  gap: 12px;
}

.list-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-heading);
}

.list-subtitle {
  font-size: 0.83rem;
  color: var(--color-text);
  opacity: 0.6;
  margin-top: 4px;
}

.trip-section {
  margin-bottom: 36px;
}

.section-label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.5;
  margin-bottom: 12px;
}

.trip-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.trip-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  background: var(--color-background-soft);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  transition: border-color 0.15s, background 0.15s;
}

.trip-card:hover {
  border-color: var(--color-border-hover);
  background: var(--color-background-mute);
}

.trip-card--shared {
  border-style: dashed;
}

.trip-card-body {
  flex: 1;
  min-width: 0;
}

.trip-destination {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
  margin-bottom: 4px;
}

.trip-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}

.trip-meta {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.6;
}

.trip-card-actions {
  flex-shrink: 0;
}

.auth-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 0;
}

.auth-gate-icon {
  font-size: 2.4rem;
}

.auth-gate-text {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.6;
}

.empty-state {
  padding: 20px 0;
}

.empty-text {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.5;
}

/* Dialog form */
.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dlabel {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.7;
  margin-top: 8px;
}

.req {
  color: #f87171;
}

@media (max-width: 540px) {
  .list-header {
    flex-direction: column;
    align-items: stretch;
  }

  .trip-grid {
    grid-template-columns: 1fr;
  }
}

</style>
