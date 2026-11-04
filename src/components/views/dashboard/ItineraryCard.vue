<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useNav } from '@/hooks/useNav'
import { useAuthenticationStore } from '@/stores/authentication'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import SignInPrompt from './SignInPrompt.vue'

interface TripCard {
  sessionId: string
  sessionTitle: string
  destination?: string
  startDate?: number
  endDate?: number
}

const { t } = useI18n()
const nav = useNav()
const { isAuthenticated } = storeToRefs(useAuthenticationStore())

const trips = ref<TripCard[]>([])
const loading = ref(false)

const load = async () => {
  if (!isAuthenticated.value) return
  loading.value = true
  const res = await HttpClient.get(ApiRoute.ITINERARY.GET_ALL).catch(() => null)
  if (res?.data?.data) {
    trips.value = [...(res.data.data.myTrips ?? []), ...(res.data.data.sharedTrips ?? [])]
  }
  loading.value = false
}
onMounted(load)
watch(isAuthenticated, load)

// Upcoming (or in-progress) trips soonest first, then trips with no date yet.
// Finished trips are left out so the card stays about what's next.
const upcoming = computed(() => {
  const now = Date.now()
  const live = trips.value.filter((x) => !x.endDate || x.endDate >= now)
  return live
    .sort((a, b) => (a.startDate ?? Infinity) - (b.startDate ?? Infinity))
    .slice(0, 3)
})

const fmt = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const dateRange = (x: TripCard) => {
  if (!x.startDate) return t('travel.list.datesTbc')
  return x.endDate ? `${fmt(x.startDate)} – ${fmt(x.endDate)}` : fmt(x.startDate)
}
</script>

<template>
  <div
    class="trip-card bp-panel"
    role="button"
    tabindex="0"
    @click="nav.redirectTo('/travel/trips')"
    @keyup.enter="nav.redirectTo('/travel/trips')"
  >
    <p class="bp-label trip-card-title">{{ t('dashboard.itinerary.title') }}</p>

    <SignInPrompt v-if="!isAuthenticated" :message="t('dashboard.itinerary.signIn')" />

    <el-skeleton v-else-if="loading && !trips.length" :rows="2" animated />

    <p v-else-if="!upcoming.length" class="trip-card-desc">{{ t('dashboard.itinerary.desc') }}</p>

    <ul v-else class="trip-list">
      <li v-for="x in upcoming" :key="x.sessionId" class="trip-row" @click.stop="nav.redirectTo(`/travel/${x.sessionId}`)">
        <span class="trip-name">{{ x.sessionTitle || t('travel.list.untitledTrip') }}</span>
        <span class="trip-meta">{{ x.destination ? `${x.destination} · ` : '' }}{{ dateRange(x) }}</span>
      </li>
    </ul>

    <span class="trip-card-open">{{ t('dashboard.itinerary.open') }}</span>
  </div>
</template>

<style scoped>
.trip-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.trip-card:hover {
  border-color: var(--color-primary);
  background: var(--color-background-mute);
}

.trip-card-title {
  margin: 0 0 10px;
}

.trip-card-desc {
  font-size: 0.85rem;
  color: var(--color-text);
  margin: 0;
}

.trip-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trip-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 10px;
  border-left: 2px solid var(--color-accent);
  cursor: pointer;
}

.trip-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trip-meta {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.7;
}

.trip-card-open {
  align-self: flex-start;
  margin-top: auto;
  padding-top: 12px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--color-primary);
}
</style>
