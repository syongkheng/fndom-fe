<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import type { ItineraryBooking } from '@/interfaces/forms/itinerary/ItineraryBooking'

const props = defineProps<{
  modelValue: boolean
  item: ItineraryBooking | null
  isNew: boolean
  paxNames: string[]
  drawerDirection?: 'rtl' | 'btt'
  drawerSize?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', item: ItineraryBooking): void
  (e: 'cancel'): void
}>()

const CATEGORIES = [
  { value: 'flight', label: 'Flight', emoji: '✈️' },
  { value: 'accommodation', label: 'Hotel', emoji: '🏨' },
  { value: 'transport', label: 'Transport', emoji: '🚌' },
  { value: 'other', label: 'Other', emoji: '📦' },
] as const

const makeBlank = (): ItineraryBooking => ({
  _localIndex: `booking-${Date.now()}`,
  item: '',
  booked: false,
  breakfast: false,
})

const form = ref<ItineraryBooking>(makeBlank())
const paymentType = ref<'instant' | 'delayed' | ''>('')
const paymentDate = ref<string>('')

function parsePaymentString(raw: string | undefined) {
  if (!raw) return { type: '' as const, date: '' }
  const lc = raw.toLowerCase()
  if (lc.startsWith('instant')) return { type: 'instant' as const, date: '' }
  if (lc.startsWith('delayed')) {
    const match = raw.match(/\(([^)]+)\)/)
    return { type: 'delayed' as const, date: match?.[1]?.trim() ?? '' }
  }
  return { type: '' as const, date: '' }
}

function buildPaymentString(): string | undefined {
  if (paymentType.value === 'instant') return 'Instant'
  if (paymentType.value === 'delayed') return paymentDate.value ? `Delayed (${paymentDate.value})` : 'Delayed'
  return undefined
}

watch(
  () => props.item,
  (val) => {
    if (val) {
      form.value = { ...val, paxBreakdown: val.paxBreakdown ? { ...val.paxBreakdown } : {} }
      const parsed = parsePaymentString(val.payment)
      paymentType.value = parsed.type
      paymentDate.value = parsed.date
    } else {
      form.value = makeBlank()
      paymentType.value = ''
      paymentDate.value = ''
    }
  },
  { immediate: true },
)

const isAccommodation = computed(() => form.value.category === 'accommodation')

// Auto-calculate nights from dates
watch(
  () => [form.value.startDate, form.value.endDate],
  ([start, end]) => {
    if (start && end) {
      const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000
      if (diff > 0) form.value.nights = Math.round(diff)
    }
  },
)

// When any pax amount changes → recalculate total from current pax names only
function setPax(name: string, value: number | undefined) {
  if (!form.value.paxBreakdown) form.value.paxBreakdown = {}
  if (value != null) {
    form.value.paxBreakdown[name] = value
  } else {
    delete form.value.paxBreakdown[name]
  }
  const sum = props.paxNames.reduce((s, n) => s + (Number(form.value.paxBreakdown?.[n]) || 0), 0)
  form.value.price = sum || undefined
}

function getPax(name: string): number | undefined {
  return form.value.paxBreakdown?.[name]
}

// When total price changes → reset breakdown and split evenly across current pax names
function onPriceChange(val: number | undefined) {
  if (val == null || !props.paxNames.length) return
  const per = Math.round((val / props.paxNames.length) * 100) / 100
  form.value.paxBreakdown = {}
  for (const name of props.paxNames) {
    form.value.paxBreakdown[name] = per
  }
}

function onSave() {
  if (!form.value.item?.trim()) return
  emit('save', { ...form.value, payment: buildPaymentString() })
  emit('update:modelValue', false)
}

function onCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

function onCategorySelect(val: string) {
  form.value.category = val as ItineraryBooking['category']
  // Clear accommodation-specific fields when switching away
  if (val !== 'accommodation') {
    form.value.startDate = undefined
    form.value.endDate = undefined
    form.value.nights = undefined
    form.value.freeCancellation = undefined
    form.value.breakfast = false
  }
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :title="isNew ? 'Add Booking' : 'Edit Booking'"
    :direction="drawerDirection ?? 'rtl'"
    :size="drawerSize ?? '420px'"
    class="booking-drawer"
  >
    <div class="drawer-body">
      <!-- Category -->
      <div class="form-section">
        <div class="form-label">Category</div>
        <div class="category-grid">
          <button
            v-for="cat in CATEGORIES"
            :key="cat.value"
            class="cat-btn"
            :class="{ 'cat-btn--active': form.category === cat.value }"
            @click="onCategorySelect(cat.value)"
            type="button"
          >
            <span class="cat-emoji">{{ cat.emoji }}</span>
            <span class="cat-label">{{ cat.label }}</span>
          </button>
        </div>
      </div>

      <!-- Item name -->
      <div class="form-section">
        <div class="form-label">Item <span class="required">*</span></div>
        <el-input v-model="form.item" placeholder="e.g. Flights, Hotel (CD), Train (成都→乐山)" />
      </div>

      <!-- Location -->
      <div class="form-section">
        <div class="form-label">Remarks</div>
        <el-input v-model="form.remarks" placeholder="e.g. CD, CQ, near station" />
      </div>

      <!-- Link -->
      <div class="form-section">
        <div class="form-label">Booking Link</div>
        <el-input v-model="form.link" placeholder="https://..." />
      </div>

      <!-- Per-person costs -->
      <div class="form-section" v-if="paxNames.length > 0">
        <div class="form-label">Per-Person Cost (SGD)</div>
        <div class="pax-grid">
          <div v-for="name in paxNames" :key="name" class="pax-row">
            <span class="pax-name">{{ name }}</span>
            <el-input-number
              :model-value="getPax(name)"
              @update:model-value="setPax(name, $event)"
              :min="0"
              :precision="2"
              :controls="false"
              placeholder="0.00"
              class="pax-input"
            />
          </div>
        </div>
      </div>

      <!-- Total price -->
      <div class="form-section">
        <div class="form-label">Total Price (SGD)</div>
        <el-input-number
          v-model="form.price"
          :min="0"
          :precision="2"
          :controls="false"
          placeholder="Auto-calculated from per-person"
          class="full-width"
          @change="onPriceChange"
        />
      </div>

      <!-- Payment timing -->
      <div class="form-section">
        <div class="form-label">Payment Timing</div>
        <div class="payment-row">
          <el-select v-model="paymentType" placeholder="Select..." clearable class="payment-type-select">
            <el-option label="Instant" value="instant" />
            <el-option label="Delayed" value="delayed" />
          </el-select>
          <el-input
            v-if="paymentType === 'delayed'"
            v-model="paymentDate"
            placeholder="e.g. Apr 15, Before 18:00 Apr 7"
            class="payment-date-input"
          />
        </div>
      </div>

      <!-- Dates (accommodation only) -->
      <template v-if="isAccommodation">
        <div class="form-section form-row">
          <div class="form-col">
            <div class="form-label">Check-in</div>
            <el-date-picker
              v-model="form.startDate"
              type="date"
              placeholder="YYYY-MM-DD"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="full-width"
            />
          </div>
          <div class="form-col">
            <div class="form-label">Check-out</div>
            <el-date-picker
              v-model="form.endDate"
              type="date"
              placeholder="YYYY-MM-DD"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="full-width"
            />
          </div>
        </div>
        <div class="form-section">
          <div class="form-label">Nights</div>
          <el-input-number
            v-model="form.nights"
            :min="1"
            :controls="false"
            placeholder="Auto-calculated"
            class="full-width"
          />
        </div>
      </template>

      <!-- Booked -->
      <div class="form-section form-switch-row">
        <div class="form-label">Booked</div>
        <el-switch v-model="form.booked" />
      </div>

      <!-- Free cancellation (accommodation + booked) -->
      <div class="form-section" v-if="isAccommodation">
        <div class="form-label">Free Cancellation</div>
        <el-input v-model="form.freeCancellation" placeholder="e.g. Before 18:00, Apr 7" />
      </div>

      <!-- Breakfast (accommodation only) -->
      <div class="form-section form-switch-row" v-if="isAccommodation">
        <div class="form-label">Breakfast Included</div>
        <el-switch v-model="form.breakfast" />
      </div>

      <!-- Deposit -->
      <div class="form-section">
        <div class="form-label">Deposit</div>
        <el-input v-model="form.deposit" placeholder="e.g. 500 CNY" />
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <el-button @click="onCancel">Cancel</el-button>
        <el-button type="primary" @click="onSave" :disabled="!form.item?.trim()">
          {{ isNew ? 'Add Booking' : 'Save Changes' }}
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style lang="scss" scoped>
.drawer-body {
  padding: 0 4px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-section {
  margin-bottom: 16px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 6px;

  .required {
    color: var(--el-color-danger);
    margin-left: 2px;
  }
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-col {
  flex: 1;
  min-width: 0;
}

.form-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .form-label {
    margin-bottom: 0;
  }
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.cat-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: var(--el-color-primary);
  }

  &--active {
    border-color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  }
}

.cat-emoji {
  font-size: 20px;
  line-height: 1;
}

.cat-label {
  font-size: 11px;
  color: var(--color-text);
}

.payment-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.payment-type-select {
  width: 130px;
  flex-shrink: 0;
}

.payment-date-input {
  flex: 1;
}

.pax-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pax-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pax-name {
  font-size: 13px;
  color: var(--color-text);
  min-width: 60px;
  flex-shrink: 0;
}

.pax-input {
  flex: 1;
}

.full-width {
  width: 100%;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
