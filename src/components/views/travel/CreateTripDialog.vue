<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { searchPlaces, type Place } from '@/composables/useGeocode'
import { DateUtils } from '@/utilities/DateUtils'

export interface CreateTripPayload {
  sessionTitle: string
  destination: string
  destinationRaw: string[]
  country?: string
  unknownDate: boolean
  durationInDays: number
  itineraryDateRaw?: string[]
  startDate?: number
  endDate?: number
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'create', payload: CreateTripPayload): void
}>()

const { t } = useI18n()

const destinationQuery = ref('')
const selectedPlace = ref<Place | null>(null)
const dateMode = ref<'exact' | 'days'>('days')
const dateRange = ref<[Date, Date] | null>(null)
const daysCount = ref(3)

const canSubmit = computed(() => !!selectedPlace.value)

const fetchSuggestions = async (query: string, cb: (results: { value: string; place: Place }[]) => void) => {
  if (!query.trim()) { cb([]); return }
  try {
    const places = await searchPlaces(query)
    cb(places.map((p) => ({ value: p.displayName, place: p })))
  } catch {
    cb([])
  }
}

const onSelect = (item: { value: string; place: Place }) => {
  selectedPlace.value = item.place
  destinationQuery.value = item.place.shortName
}

const reset = () => {
  destinationQuery.value = ''
  selectedPlace.value = null
  dateMode.value = 'days'
  dateRange.value = null
  daysCount.value = 3
}

const close = () => {
  emit('update:modelValue', false)
  reset()
}

const submit = () => {
  if (!selectedPlace.value) return
  const place = selectedPlace.value

  const payload: CreateTripPayload = {
    sessionTitle: place.shortName,
    destination: place.shortName,
    destinationRaw: [place.shortName],
    country: place.country,
    unknownDate: dateMode.value === 'days',
    durationInDays: dateMode.value === 'days' ? daysCount.value : 1,
  }

  if (dateMode.value === 'exact' && dateRange.value) {
    const [start, end] = dateRange.value
    payload.itineraryDateRaw = [start.toISOString(), end.toISOString()]
    payload.startDate = start.getTime()
    payload.endDate = end.getTime()
    payload.durationInDays = DateUtils.calculateDurationInDays(start, end, true)
  }

  emit('create', payload)
  close()
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    :title="t('travel.createTrip.dialogTitle')"
    width="440px"
    @close="reset"
  >
    <div class="create-trip-form">
      <el-form-item :label="t('travel.createTrip.destinationLabel')">
        <el-autocomplete
          v-model="destinationQuery"
          :fetch-suggestions="fetchSuggestions"
          :placeholder="t('travel.createTrip.destinationPlaceholder')"
          style="width: 100%"
          @select="onSelect"
          @input="selectedPlace = null"
        >
          <template #default="{ item }">
            <div>{{ item.value }}</div>
          </template>
        </el-autocomplete>
      </el-form-item>

      <el-form-item :label="t('travel.createTrip.datesLabel')">
        <el-radio-group v-model="dateMode">
          <el-radio value="days">{{ t('travel.createTrip.numberOfDays') }}</el-radio>
          <el-radio value="exact">{{ t('travel.createTrip.exactDates') }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="dateMode === 'days'">
        <el-input-number v-model="daysCount" :min="1" :max="60" />
      </el-form-item>
      <el-form-item v-else>
        <el-date-picker v-model="dateRange" type="daterange" style="width: 100%" />
      </el-form-item>
    </div>

    <template #footer>
      <el-button @click="close">{{ t('travel.createTrip.cancel') }}</el-button>
      <el-button type="primary" :disabled="!canSubmit" @click="submit">{{ t('travel.createTrip.submit') }}</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.create-trip-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
