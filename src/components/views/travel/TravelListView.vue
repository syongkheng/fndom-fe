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
const creating = ref(false)

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

const handleCreate = async () => {
  if (!isAuthenticated.value) { layoutStore.loginDialog.setTrue(); return }
  creating.value = true
  const res = await HttpClient.post(ApiRoute.ITINERARY.CREATE, {
    idempotencyKey: GeneratorUtils.generateUUID(),
    sessionTitle: t('travel.list.untitledTrip'),
    destinationRaw: [],
    numberOfPax: 1,
    durationInDays: 1,
    unknownDate: true,
    agendaItems: [],
    _agendaIdsToDelete: [],
    _agendaIdsToUpdate: [],
  }).catch(() => null)
  creating.value = false
  if (!res?.data?.data?.sessionId) { ElMessage.error(t('travel.list.failed')); return }
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
      <div class="guest-draft-card" @click="nav.redirectTo('/travel/draft')">
        <span class="guest-draft-icon">✏️</span>
        <div>
          <div class="guest-draft-title">{{ t('travel.list.startDraft') }}</div>
          <div class="guest-draft-sub">{{ t('travel.list.startDraftSub') }}</div>
        </div>
      </div>
    </div>

    <template v-else>
    <header class="list-header">
      <div>
        <h1 class="list-title">{{ t('travel.list.title') }}</h1>
        <p class="list-subtitle">{{ t('travel.list.subtitle') }}</p>
      </div>
      <el-button type="primary" :loading="creating" @click="handleCreate">{{ t('travel.list.newTrip') }}</el-button>
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

.guest-draft-card {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 16px;
  padding: 16px 20px;
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  background: var(--color-background-soft);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  width: 280px;
  max-width: 100%;
}

.guest-draft-card:hover {
  border-color: var(--el-color-primary);
  background: var(--color-background-mute);
}

.guest-draft-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.guest-draft-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
}

.guest-draft-sub {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.55;
  margin-top: 2px;
}
</style>
