<script setup lang="ts">
import { reactive, watch } from 'vue'
import { ElDialog, ElForm, ElFormItem, ElInput, ElButton, ElMessage } from 'element-plus'

import { useBreakpointManager } from '@/hooks/useBreakpointManager'
import { Breakpoint } from '@/constants/Breakpoint'
import { useLayoutStateStore } from '@/stores/layoutState'
import type { FndManageEvent } from '@/interfaces/forms/FndManageEvent.model'

const props = defineProps<{
  event?: FndManageEvent
}>()

const emit = defineEmits<{
  (e: 'submit', event: FndManageEvent): void
}>()

const layoutStore = useLayoutStateStore()

// --- Reactive Form ---
const eventForm = reactive<FndManageEvent>({
  event_dt: 0,
  title: '',
  content: '',
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
  { immediate: true }
)

// --- Close modal ---
const closeModal = () => {
  layoutStore.fndEventDialog.setFalse()
}

// --- Submit form ---
const submitForm = () => {
  if (!eventForm.title || !eventForm.content) {
    ElMessage.warning('Please fill all required fields')
    return
  }

  emit('submit', { ...eventForm })
  closeModal()
}

// --- Responsive ---
const { isScreensizeBelow } = useBreakpointManager()
const smallWidth = isScreensizeBelow(Breakpoint.M)
</script>

<template>
  <el-dialog v-model="layoutStore.fndEventDialog.isVisible" :title="props.event ? 'Edit event' : 'Add New event'"
    :width="smallWidth ? '90%' : '500px'" :before-close="closeModal">
    <el-form label-position="top" class="event-form">

      <el-form-item label="Title">
        <el-input v-model="eventForm.title" placeholder="Enter title" />
      </el-form-item>

      <el-form-item label="Content">
        <el-input type="textarea" v-model="eventForm.content" placeholder="Enter content" :rows="4" />
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

.classification-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.cancel-btn {
  margin-right: 0.5rem;
}

.submit-btn {
  min-width: 100px;
}

@media (max-width: 600px) {
  .event-form {
    gap: 0.75rem;
  }

  .classification-radio-group {
    gap: 0.5rem;
  }
}
</style>
