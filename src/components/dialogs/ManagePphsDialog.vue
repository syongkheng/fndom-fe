<script setup lang="ts">
import { Breakpoint } from '@/constants/Breakpoint';
import { useBreakpointManager } from '@/hooks/useBreakpointManager';
import type { PphsRecord } from '@/interfaces/PphsRecord.model';
import { useLayoutStateStore } from '@/stores/layoutState';
import { usePphsStore } from '@/stores/pphs';
import { ElMessage } from 'element-plus';
import { computed, reactive, watch } from 'vue';

const props = defineProps({
  record: Object as () => PphsRecord | undefined,
})

const layoutStore = useLayoutStateStore()
const pphsManager = usePphsStore();

// ✅ Reactive local copy of record
const pphsRecordForm = reactive<PphsRecord>({
  town: '',
  address: '',
  flatTypes: { '2-room': '0', '3-room': '0', '4-room': '0' },
  siteExpiry: '',
  formedUrl: '',
  lat: '',
  lng: '',
  source: '',
})

// Watch props.record and update reactive form
watch(
  () => props.record,
  (newRecord) => {
    if (newRecord) {
      Object.assign(pphsRecordForm, {
        ...newRecord,
        flatTypes: { ...newRecord.flatTypes } // deep copy
      })
    } else {
      Object.assign(pphsRecordForm, {
        town: '',
        address: '',
        flatTypes: { '2-room': '0', '3-room': '0', '4-room': '0' },
        siteExpiry: '',
        formedUrl: '',
        lat: '',
        lng: '',
        source: '',
      })
    }
  },
  { immediate: true, deep: true }
)

const closeModal = () => {
  layoutStore.hdbManagePphsDialog.setFalse()
}

const submitForm = async () => {
  const result = await pphsManager.updatePphsCoordinates(pphsRecordForm)
  if (result) {
    ElMessage.success('PPHS record saved successfully')
  } else {
    ElMessage.error('Failed to save PPHS record')
  }
  closeModal()
}

const { isScreensizeBelow } = useBreakpointManager()
const smallWidth = computed(() => isScreensizeBelow(Breakpoint.M))
</script>
<template>
  <el-dialog v-model="layoutStore.hdbManagePphsDialog.isVisible"
    :title="props.record?.address ? (pphsManager.viewOnly ? 'View PPHS Record' : 'Edit PPHS Record') : 'Add PPHS Record'"
    :width="smallWidth ? '90%' : '500px'" :before-close="closeModal">
    <el-form label-position="top" class="pphs-record-form">
      <el-form-item label="Town">
        <el-input v-model="pphsRecordForm.town" :disabled="pphsManager.viewOnly"></el-input>
      </el-form-item>
      <el-form-item label="Address">
        <el-input v-model="pphsRecordForm.address" :disabled="pphsManager.viewOnly"></el-input>
      </el-form-item>
      <el-form-item label="Site Expiry">
        <el-input v-model="pphsRecordForm.siteExpiry" :disabled="pphsManager.viewOnly"></el-input>
      </el-form-item>
      <el-form-item label="Latitude">
        <el-input v-model="pphsRecordForm.lat" :disabled="pphsManager.viewOnly"></el-input>
      </el-form-item>
      <el-form-item label="Longitude">
        <el-input v-model="pphsRecordForm.lng" :disabled="pphsManager.viewOnly"></el-input>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeModal" class="cancel-btn">Cancel</el-button>
      <el-button type="primary" @click="submitForm" class="submit-btn">
        {{ props.record ? 'Save' : 'Submit' }}
      </el-button>
    </template>
  </el-dialog>
</template>
