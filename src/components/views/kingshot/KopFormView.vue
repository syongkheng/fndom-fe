<script setup lang="ts">
import HttpClient from '@/interceptors/HttpClient'
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

const appointmentOptions = [
  { value: 'D1-CHIEF_MINISTER', label: 'Day 1 [Construction] - CHIEF MINISTER' },
  { value: 'D2-CHIEF_MINISTER', label: 'Day 2 [Research] - CHIEF MINISTER' },
  { value: 'D4-NOBLE_ADVISOR', label: 'Day 4 [Troops Training] - NOBLE ADVISOR' },
  { value: 'D5-CHIEF_MINISTER', label: 'Day 5 [All In] - CHIEF MINISTER' }
]

const allianceOptions = [
  { value: 'VKG', label: 'VKG' },
  { value: 'FND', label: 'FND' },
  { value: 'HKL', label: 'HKL' },
  { value: 'AHG', label: 'AHG' },
  { value: 'SOL', label: 'SOL' },
  { value: 'OTH', label: 'Others' }
]

const form = ref({
  governorId: '',
  governorName: '',
  alliance: '',
  appointment: [] as string[],
  appointmentTiming: [] as string[],
  remarks: '',
})

const governorIdErrorMessage = ref('')
const disableSubmitButton = ref(true)
const formErrorMessage = ref('')
const formSuccess = ref(false)

const timeSlots = computed(() => {
  const slots: string[] = []

  for (let hour = 0; hour < 24; hour++) {
    for (let min of [0, 30]) {
      let endH = hour
      let endM = min + 30

      if (endM === 60) {
        endM = 0
        endH = hour + 1
      }

      if (endH === 24) endH = 0

      const start = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
      const end = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')} UTC`

      slots.push(`${start} - ${end}`)
    }
  }

  return slots
})

const handleValidateGovernorId = async () => {
  if (form.value.governorId.length < 8) {
    governorIdErrorMessage.value = 'ID cannot be less than 8 characters'
    return
  }

  const identityResponse = await HttpClient.post("/api/fnd/identity", {
    identity: form.value.governorId
  }).catch((err) => {
    if (err.status !== 200) {
      governorIdErrorMessage.value = 'Governor does not exists in 236.'
      return
    }
    return err
  })

  if (identityResponse.data.data) {
    governorIdErrorMessage.value = ""
    form.value.governorName = identityResponse.data.data;
    disableSubmitButton.value = false;
  }
}

const handleSubmitForm = async () => {
  if (!form.value.governorName) {
    formErrorMessage.value = "Please validate your Governor ID.";
    return;
  }

  if (!form.value.alliance) {
    formErrorMessage.value = "Please choose an alliance.";
    return;
  }

  if (form.value.appointment.length < 1) {
    formErrorMessage.value = "Please choose at least 1 appointment.";
    return;
  }

  if (form.value.appointmentTiming.length < 1) {
    formErrorMessage.value = "Please choose at least 1 timing.";
    return;
  }

  formErrorMessage.value = "";

  await HttpClient.post("/api/fnd/appt", {
    ...form.value
  }).catch(() => formErrorMessage.value = "Something went wrong please try again.")

  if (!formErrorMessage.value) {
    ElMessage.success("Registered successfully.")
    formSuccess.value = true
  }
}
</script>

<template>
  <div class="page-container">
    <form class="form-card">
      <h1 class="page-title">KoP Appointment Booking</h1>
      <a href="https://docs.google.com/spreadsheets/d/1NFMWxbwj5REfT9EOTL3CXErvEyrqnLIpuAiDW9d4urg/edit?usp=sharing"
        target="_blank" rel="noopener noreferrer">
        {{ "View Responses" }}
      </a>
      <p style="color: #333; margin-top:0.25rem; margin-bottom: 0.25rem;"> Only the latest submission will be
        considered.</p>


      <!-- Governor Section -->
      <section class="section">
        <h2>Governor Information</h2>

        <label class="label">Governor ID</label>
        <div class="row">
          <el-input v-model="form.governorId" placeholder="Enter Governor ID" size="large" />
          <el-button type="primary" size="large" @click="handleValidateGovernorId">
            Validate
          </el-button>
        </div>

        <p v-if="governorIdErrorMessage" class="error">
          {{ governorIdErrorMessage }}
        </p>

        <div style="display: flex; width:100%; justify-content: center; margin-top: 0.25rem;">
          <el-tag :type="form.governorName ? 'success' : 'warning'" class="tag" style="justify-self: center;">
            {{ form.governorName || 'Not validated yet' }}
          </el-tag>
        </div>

        <label class="label">Alliance</label>
        <el-select v-model="form.alliance" placeholder="Select Alliance" size="large" style="width: 100%;">
          <el-option v-for="item in allianceOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </section>

      <!-- Appointment Section -->
      <section class="section">
        <h2>Appointment Selection</h2>

        <label class="label">If you want to apply for different timeslots for different days, please resubmit a new
          application.</label>
        <label class="label">I want to apply for: (Multi-selection)</label>
        <el-checkbox-group v-model="form.appointment" class="grid-2">
          <el-checkbox v-for="slot in appointmentOptions" :key="slot.value" :label="slot.label" />
        </el-checkbox-group>

        <label class="label">Time slots (UTC) that fits me the best:</label>
        <div class="checkbox-container">
          <el-checkbox-group v-model="form.appointmentTiming" class="grid-3">
            <el-checkbox v-for="slot in timeSlots" :key="slot" :label="slot" border />
          </el-checkbox-group>
        </div>
      </section>

      <div>
        <label class="label">Any remarks (Optional)</label>
        <el-input v-model="form.remarks" style="width: 100%" :rows="4" type="textarea"
          placeholder="Any comments (Optional)" />
      </div>

      <div style="width: 100%; margin-top: 1rem;">
        <el-button submit type="primary" :disabled="disableSubmitButton" @click="handleSubmitForm"
          style="width: 100%">Submit</el-button>
        <p v-if="formErrorMessage" class="error">
          {{ formErrorMessage }}
        </p>
      </div>
    </form>

    <div v-if="formSuccess" style="display: flex; width: 100%; justify-content: center;">
      <a href="https://docs.google.com/spreadsheets/d/1NFMWxbwj5REfT9EOTL3CXErvEyrqnLIpuAiDW9d4urg/edit?usp=sharing"
        target="_blank" rel="noopener noreferrer">
        {{ "View Responses" }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.form-card {
  max-width: 1200px;
  border-radius: 16px;
  padding: 20px;
  color: #e5e7eb;

  @media (max-width: 1200px) {
    width: 95vw;
  }
}

.page-title {
  margin-bottom: 16px;
}

.section {
  margin-bottom: 24px;
}

.label {
  display: block;
  margin: 12px 0 6px;
  font-size: 0.85rem;
  color: #9ca3af;
}

.row {
  display: flex;
  gap: 8px;
}

.error {
  color: #f87171;
  font-size: 0.85rem;
  margin-top: 6px;
}

.tag {
  margin-top: 6px;
}

.checkbox-container {
  max-height: 240px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid #1f2933;
  border-radius: 8px;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 8px;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

@media (max-width: 480px) {
  .row {
    flex-direction: column;
  }

  .grid-3 {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
