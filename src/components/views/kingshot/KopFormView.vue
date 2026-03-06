<script setup lang="ts">
import HttpClient from '@/interceptors/HttpClient'
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useNav } from '@/hooks/useNav'
import { useKopRegistration } from '@/hooks/useKopRegistration'

const nav = useNav()
const { isRegistrationOpen } = useKopRegistration()

const appointmentOptions = [
  { value: 'D1-CHIEF_MINISTER', label: 'Day 1 — Chief Minister', sub: 'Construction' },
  { value: 'D2-CHIEF_MINISTER', label: 'Day 2 — Chief Minister', sub: 'Research' },
  { value: 'D4-NOBLE_ADVISOR',  label: 'Day 4 — Noble Advisor',  sub: 'Troop Training' },
  { value: 'D5-CHIEF_MINISTER', label: 'Day 5 — Chief Minister',  sub: 'All In' },
]

const allianceOptions = [
  { value: 'VKG', label: 'VKG' },
  { value: 'FND', label: 'FND' },
  { value: 'HKL', label: 'HKL' },
  { value: 'AHG', label: 'AHG' },
  { value: 'SOL', label: 'SOL' },
  { value: 'OTH', label: 'Others' },
]

const form = ref({
  governorId: '',
  governorName: '',
  alliance: '',
  remarks: '',
})

const selectedDays = ref<string[]>([])
const dayTimeslots = ref<Record<string, string[]>>({})

// Ensure an entry exists whenever a day is selected
watch(selectedDays, (days) => {
  days.forEach((day) => {
    if (!dayTimeslots.value[day]) dayTimeslots.value[day] = []
  })
})

const selections = computed(() =>
  selectedDays.value.map((day) => ({
    day,
    timeslots: dayTimeslots.value[day] ?? [],
  }))
)

const timeSlots = computed(() => {
  const slots: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (const min of [0, 30]) {
      let endH = hour
      let endM = min + 30
      if (endM === 60) { endM = 0; endH = hour + 1 }
      if (endH === 24) endH = 0
      const start = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
      const end   = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')} UTC`
      slots.push(`${start} - ${end}`)
    }
  }
  return slots
})

const governorIdErrorMessage = ref('')
const disableSubmitButton = ref(true)
const formErrorMessage = ref('')
const formSuccess = ref(false)

const handleValidateGovernorId = async () => {
  if (form.value.governorId.length < 8) {
    governorIdErrorMessage.value = 'ID cannot be less than 8 characters'
    return
  }
  const res = await HttpClient.post('/api/fnd/identity', {
    identity: form.value.governorId,
  }).catch((err) => {
    if (err.status !== 200) governorIdErrorMessage.value = 'Governor does not exist in 236.'
    return err
  })
  if (res?.data?.data) {
    governorIdErrorMessage.value = ''
    form.value.governorName = res.data.data
    disableSubmitButton.value = false
  }
}

const handleSubmitForm = async () => {
  if (!form.value.governorName) {
    formErrorMessage.value = 'Please validate your Governor ID.'
    return
  }
  if (!form.value.alliance) {
    formErrorMessage.value = 'Please choose an alliance.'
    return
  }
  if (selectedDays.value.length < 1) {
    formErrorMessage.value = 'Please select at least one appointment day.'
    return
  }
  const emptyDay = selections.value.find((s) => s.timeslots.length === 0)
  if (emptyDay) {
    const opt = appointmentOptions.find((o) => o.value === emptyDay.day)
    formErrorMessage.value = `Please select at least one timeslot for ${opt?.label ?? emptyDay.day}.`
    return
  }

  formErrorMessage.value = ''
  await HttpClient.post('/api/fnd/appt', {
    governorId: form.value.governorId,
    governorName: form.value.governorName,
    alliance: form.value.alliance,
    remarks: form.value.remarks,
    appointment: selectedDays.value,
    appointmentTiming: selections.value,
  }).catch(() => (formErrorMessage.value = 'Something went wrong, please try again.'))

  if (!formErrorMessage.value) {
    ElMessage.success('Registered successfully.')
    formSuccess.value = true
  }
}
</script>

<template>
  <div class="page-container">
    <form class="form-card">
      <div class="form-header">
        <h1 class="page-title">KoP Appointment Booking</h1>
        <a
          href="https://docs.google.com/spreadsheets/d/1NFMWxbwj5REfT9EOTL3CXErvEyrqnLIpuAiDW9d4urg/edit?usp=sharing"
          target="_blank" rel="noopener noreferrer" class="responses-link"
        >View Responses ↗</a>
        <p class="form-hint">Only your latest submission will be considered.</p>
      </div>

      <!-- Governor -->
      <section class="section">
        <h2 class="section-title">Governor Information</h2>

        <label class="label">Governor ID</label>
        <div class="row">
          <el-input v-model="form.governorId" placeholder="Enter Governor ID" size="large" />
          <el-button type="primary" size="large" @click="handleValidateGovernorId">Validate</el-button>
        </div>
        <p v-if="governorIdErrorMessage" class="error">{{ governorIdErrorMessage }}</p>
        <div class="tag-row">
          <el-tag :type="form.governorName ? 'success' : 'warning'">
            {{ form.governorName || 'Not validated yet' }}
          </el-tag>
        </div>

        <label class="label">Alliance</label>
        <el-select v-model="form.alliance" placeholder="Select Alliance" size="large" style="width: 100%;">
          <el-option v-for="item in allianceOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </section>

      <!-- Appointment Days -->
      <section class="section">
        <h2 class="section-title">Appointment Days</h2>
        <p class="label">Select the days you are available for:</p>

        <div class="day-grid">
          <label
            v-for="opt in appointmentOptions"
            :key="opt.value"
            class="day-option"
            :class="{ 'day-option--active': selectedDays.includes(opt.value) }"
          >
            <input type="checkbox" :value="opt.value" v-model="selectedDays" class="day-checkbox" />
            <div class="day-option-text">
              <span class="day-name">{{ opt.label }}</span>
              <span class="day-sub">{{ opt.sub }}</span>
            </div>
          </label>
        </div>
      </section>

      <!-- Per-day timeslots -->
      <section v-if="selectedDays.length > 0" class="section">
        <h2 class="section-title">Preferred Timeslots</h2>
        <p class="label">Select all UTC windows that work for you on each day.</p>

        <div v-for="opt in appointmentOptions.filter(o => selectedDays.includes(o.value))" :key="opt.value" class="day-timeslot-block">
          <div class="day-timeslot-header">
            <span class="day-timeslot-label">{{ opt.label }}</span>
            <span class="day-timeslot-count">
              {{ dayTimeslots[opt.value]?.length ?? 0 }} selected
            </span>
          </div>
          <div class="timeslot-scroll">
            <div class="timeslot-grid">
              <label
                v-for="slot in timeSlots"
                :key="slot"
                class="slot-chip"
                :class="{ 'slot-chip--active': dayTimeslots[opt.value]?.includes(slot) }"
              >
                <input type="checkbox" :value="slot" v-model="dayTimeslots[opt.value]" class="slot-checkbox" />
                {{ slot }}
              </label>
            </div>
          </div>
        </div>
      </section>

      <!-- Remarks -->
      <section class="section">
        <label class="label">Remarks (Optional)</label>
        <el-input v-model="form.remarks" style="width: 100%" :rows="3" type="textarea" placeholder="Any additional comments" />
      </section>

      <!-- Submit -->
      <div>
        <el-button
          type="primary"
          :disabled="disableSubmitButton"
          @click="handleSubmitForm"
          style="width: 100%"
        >
          Submit
        </el-button>
        <p v-if="formErrorMessage" class="error" style="margin-top: 8px;">{{ formErrorMessage }}</p>
      </div>
    </form>

    <div v-if="formSuccess" class="success-link">
      <a
        href="https://docs.google.com/spreadsheets/d/1NFMWxbwj5REfT9EOTL3CXErvEyrqnLIpuAiDW9d4urg/edit?usp=sharing"
        target="_blank" rel="noopener noreferrer"
      >View your submission ↗</a>
    </div>

    <el-dialog
      :model-value="!isRegistrationOpen"
      width="360px"
      align-center
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="closed-dialog">
        <div class="closed-icon">🔒</div>
        <h3 class="closed-title">Registration Not Open</h3>
        <p class="closed-desc">The KoP registration period has not started yet. Check back closer to the next KvK event.</p>
        <el-button type="primary" style="width: 100%; margin-top: 8px;" @click="nav.redirectTo('/ks')">
          Back to Kingshot
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.form-card {
  max-width: 860px;
  width: 100%;
  padding: 24px 20px;
}

.form-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 6px;
}

.responses-link {
  font-size: 0.82rem;
  color: var(--hyperlink-color);
}

.responses-link:hover {
  color: var(--hyperlink-hover);
}

.form-hint {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.55;
  margin-top: 4px;
}

.section {
  margin-bottom: 28px;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border);
}

.label {
  display: block;
  font-size: 0.83rem;
  color: var(--color-text);
  opacity: 0.7;
  margin-bottom: 8px;
}

.row {
  display: flex;
  gap: 8px;
}

.tag-row {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.error {
  color: #f87171;
  font-size: 0.83rem;
  margin-top: 6px;
}

/* ── Day selector ── */
.day-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.day-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  background: var(--color-background-soft);
  transition: border-color 0.15s, background 0.15s;
  user-select: none;
}

.day-option--active {
  border-color: var(--el-color-primary);
  background: var(--color-background-mute);
}

.day-checkbox {
  accent-color: var(--el-color-primary);
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.day-option-text {
  display: flex;
  flex-direction: column;
}

.day-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-heading);
  line-height: 1.3;
}

.day-sub {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.55;
}

/* ── Timeslot blocks ── */
.day-timeslot-block {
  margin-bottom: 20px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
}

.day-timeslot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: var(--color-background-mute);
  border-bottom: 1px solid var(--color-border);
}

.day-timeslot-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-heading);
}

.day-timeslot-count {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.6;
}

.timeslot-scroll {
  max-height: 220px;
  overflow-y: auto;
  padding: 10px 12px;
}

.timeslot-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.slot-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.78rem;
  color: var(--color-text);
  cursor: pointer;
  background: var(--color-background-soft);
  transition: border-color 0.12s, background 0.12s;
  user-select: none;
}

.slot-chip--active {
  border-color: var(--el-color-primary);
  color: var(--color-heading);
  background: var(--color-background-mute);
}

.slot-checkbox {
  accent-color: var(--el-color-primary);
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.success-link {
  display: flex;
  justify-content: center;
  margin-top: 12px;
  font-size: 0.85rem;
}

.closed-dialog {
  text-align: center;
  padding: 8px 4px 4px;
}

.closed-icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

.closed-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 8px;
}

.closed-desc {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
  line-height: 1.55;
}

@media (max-width: 480px) {
  .row {
    flex-direction: column;
  }

  .day-grid {
    grid-template-columns: 1fr;
  }

  .timeslot-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
