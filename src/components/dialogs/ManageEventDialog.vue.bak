<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import { ElDialog, ElForm, ElFormItem, ElInput, ElButton, ElMessage } from 'element-plus'

import { useBreakpointManager } from '@/hooks/useBreakpointManager'
import { Breakpoint } from '@/constants/Breakpoint'
import { useLayoutStateStore } from '@/stores/layoutState'
import type { FndManageEvent } from '@/interfaces/forms/FndManageEvent.model'
import { useEventManagerStore } from '@/stores/event'

const props = defineProps<{
  event?: FndManageEvent
}>()

const eventManager = useEventManagerStore()
const layoutStore = useLayoutStateStore()

// --- Reactive Form ---
const eventForm = reactive<FndManageEvent>({
  event_dt: 0,
  title: '',
  content: '',
  view_count: 0,
})

// --- Convert event_dt to input-friendly string ---
const eventDateTime = computed({
  get: () => {
    if (!eventForm.event_dt) return ''
    const date = new Date(eventForm.event_dt * 1000) // seconds -> ms
    return date.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
  },
  set: (val: string) => {
    if (!val) {
      eventForm.event_dt = 0
      return
    }
    // Convert ISO string to Unix timestamp in seconds
    eventForm.event_dt = Math.floor(new Date(val).getTime() / 1000)
  },
})

// --- Sync prop into form when editing ---
watch(
  () => props.event,
  (newevent) => {
    if (newevent) {
      eventForm.event_dt = newevent.event_dt
      eventForm.title = newevent.title
      eventForm.content = newevent.content
      eventForm.created_by = newevent.created_by || 'UNKNOWN'
    } else {
      // Reset form for new event
      eventForm.event_dt = 0
      eventForm.title = ''
      eventForm.content = ''
      eventForm.created_by = ''
    }
  },
  { immediate: true, deep: true }
)

// --- Close modal ---
const closeModal = () => {
  layoutStore.fndEventDialog.setFalse()
}

// --- Submit form ---
const submitForm = async () => {
  if (!eventForm.title || !eventForm.content) {
    ElMessage.warning('Please fill all required fields')
    return
  }

  if (props.event && props.event.id) {
    await eventManager.updateEvent(eventForm, props.event.id)
  } else {
    await eventManager.createEvent(eventForm)
  }

  closeModal()
}

// --- Responsive ---
const { isScreensizeBelow } = useBreakpointManager()
const smallWidth = isScreensizeBelow(Breakpoint.M)
</script>

<template>
  <el-dialog v-model="layoutStore.fndEventDialog.isVisible" :title="props.event ? 'Edit Event' : 'Add New Event'"
    :width="smallWidth ? '90%' : '500px'" :before-close="closeModal">
    <el-form label-position="top" class="event-form">

      <el-form-item label="Title">
        <el-input v-model="eventForm.title" placeholder="Enter title" :disabled="eventManager.viewOnly" />
      </el-form-item>

      <el-form-item label="Event Date & Time">
        <el-input type="datetime-local" v-model="eventDateTime" placeholder="Select date and time"
          :disabled="eventManager.viewOnly" />
      </el-form-item>

      <el-form-item label="Content">
        <el-input type="textarea" v-model="eventForm.content" placeholder="Enter content" :rows="4"
          :disabled="eventManager.viewOnly" />
      </el-form-item>

    </el-form>

    <template #footer>
      <el-button @click="closeModal" class="cancel-btn">Cancel</el-button>
      <el-button type="primary" @click="submitForm" class="submit-btn">
        {{ props.event ? 'Save' : 'Submit' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.event-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cancel-btn {
  margin-right: 0.5rem;
}

.submit-btn {
  min-width: 100px;
}
</style>
