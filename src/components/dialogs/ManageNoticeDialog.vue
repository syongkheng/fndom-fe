<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { ElDialog, ElForm, ElFormItem, ElInput, ElRadioGroup, ElRadio, ElButton, ElMessage } from 'element-plus'
import type { FndManageNotice } from '@/interfaces/forms/FndManageNotice.model'
import { useBreakpointManager } from '@/hooks/useBreakpointManager'
import { Breakpoint } from '@/constants/Breakpoint'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useNoticeManagerStore } from '@/stores/notice'

const props = defineProps({
  notice: Object as () => FndManageNotice | undefined,
})

const layoutStore = useLayoutStateStore()
const noticeManager = useNoticeManagerStore()

// --- Reactive Form ---
const noticeForm = reactive<FndManageNotice>({
  type: 'Notice',
  title: '',
  content: '',
  classification: 'OPEN',
  view_count: 0,
  created_by: '',
})

// --- Classification options ---
const classificationOptions = ['OPEN', 'R1', 'R2', 'R3', 'R4']

// --- Sync prop into form when editing ---
watch(
  () => props.notice,
  (newNotice) => {
    if (newNotice) {
      noticeForm.type = newNotice.type
      noticeForm.title = newNotice.title
      noticeForm.content = newNotice.content
      noticeForm.classification = newNotice.classification || 'OPEN'
      noticeForm.created_by = newNotice.created_by || 'UNKNOWN'
    } else {
      // Reset form for new notice
      noticeForm.type = 'Notice'
      noticeForm.title = ''
      noticeForm.content = ''
      noticeForm.classification = 'OPEN'
      noticeForm.created_by = ''
    }
  },
  { immediate: true, deep: true }
)

// --- Close modal ---
const closeModal = () => {
  layoutStore.fndManageNoticeDialog.setFalse()
}

// --- Submit form ---
const submitForm = () => {
  if (!noticeForm.title || !noticeForm.content) {
    ElMessage.warning('Please fill all required fields')
    return
  }

  if (props.notice?.id !== undefined) {
    noticeManager.updateNotice(noticeForm, props.notice.id!)
  } else {
    noticeManager.createNotice(noticeForm)
  }
  closeModal()
}

// --- Responsive ---
const { isScreensizeBelow } = useBreakpointManager()
const smallWidth = computed(() => isScreensizeBelow(Breakpoint.M))
</script>

<template>
  <el-dialog v-model="layoutStore.fndManageNoticeDialog.isVisible" :title="props.notice
    ? (noticeManager.viewOnly ? 'View Notice' : 'Edit Notice')
    : 'Add New Notice'" :width="smallWidth ? '90%' : '500px'" :before-close="closeModal">
    <el-form label-position="top" class="notice-form">
      <!-- <el-form-item label="Type">
        <el-select v-model="noticeForm.type" placeholder="Select Type" :disabled="noticeManager.viewOnly">
          <el-option label="Notice" value="Notice" />
          <el-option label="Poll" value="Poll" />
        </el-select>
      </el-form-item> -->

      <el-form-item label="Title">
        <el-input v-model="noticeForm.title" placeholder="Enter title" :disabled="noticeManager.viewOnly" />
      </el-form-item>

      <el-form-item label="Content">
        <el-input type="textarea" v-model="noticeForm.content" placeholder="Enter content" :rows="4"
          :disabled="noticeManager.viewOnly" />
      </el-form-item>

      <el-form-item label="Classification">
        <el-radio-group v-model="noticeForm.classification" class="classification-radio-group"
          :disabled="noticeManager.viewOnly">
          <el-radio v-for="option in classificationOptions" :key="option" :label="option">
            {{ option }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer v-if="!noticeManager.viewOnly">
      <el-button @click="closeModal" class="cancel-btn">Cancel</el-button>
      <el-button type="primary" @click="submitForm" class="submit-btn">
        {{ props.notice ? 'Save' : 'Submit' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.notice-form {
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
  .notice-form {
    gap: 0.75rem;
  }

  .classification-radio-group {
    gap: 0.5rem;
  }
}
</style>
