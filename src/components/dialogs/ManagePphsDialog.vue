<script setup lang="ts">
import { Breakpoint } from '@/constants/Breakpoint';
import { useBreakpointManager } from '@/hooks/useBreakpointManager';
import type { PphsRecord } from '@/interfaces/PphsRecord.model';
import { useLayoutStateStore } from '@/stores/layoutState';
import { usePphsStore } from '@/stores/pphs';
import { ElMessage } from 'element-plus';
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n'

const props = defineProps({
  record: Object as () => PphsRecord | undefined,
})

const layoutStore = useLayoutStateStore()
const pphsManager = usePphsStore();
const { t } = useI18n()

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

watch(
  () => props.record,
  (newRecord) => {
    if (newRecord) {
      Object.assign(pphsRecordForm, { ...newRecord, flatTypes: { ...newRecord.flatTypes } })
    } else {
      Object.assign(pphsRecordForm, {
        town: '', address: '', flatTypes: { '2-room': '0', '3-room': '0', '4-room': '0' },
        siteExpiry: '', formedUrl: '', lat: '', lng: '', source: '',
      })
    }
  },
  { immediate: true, deep: true }
)

const closeModal = () => layoutStore.hdbManagePphsDialog.setFalse()

const submitForm = async () => {
  const result = await pphsManager.updatePphsCoordinates(pphsRecordForm)
  if (result) {
    ElMessage.success(t('toast.pphsUpdateSuccess'))
  } else {
    ElMessage.error(t('toast.pphsUpdateFailed'))
  }
  closeModal()
}

const { isScreensizeBelow } = useBreakpointManager()
const smallWidth = computed(() => isScreensizeBelow(Breakpoint.M))

const isEdit = computed(() => !!props.record?.address)
</script>

<template>
  <el-dialog
    v-model="layoutStore.hdbManagePphsDialog.isVisible"
    :width="smallWidth ? '92%' : '480px'"
    :before-close="closeModal"
    class="pphs-dialog"
    align-center
  >
    <template #header>
      <div class="dialog-header">
        <div class="dialog-header-icon">📍</div>
        <div>
          <div class="dialog-title">{{ isEdit ? 'Edit PPHS Record' : 'Add PPHS Record' }}</div>
          <div class="dialog-subtitle" v-if="pphsRecordForm.address">{{ pphsRecordForm.address }}</div>
        </div>
      </div>
    </template>

    <el-form label-position="top" class="pphs-form">

      <div class="form-row">
        <el-form-item label="Town" class="form-item">
          <el-input v-model="pphsRecordForm.town" :disabled="pphsManager.viewOnly" placeholder="e.g. Bukit Merah" />
        </el-form-item>
        <el-form-item label="Site Expiry" class="form-item">
          <el-input v-model="pphsRecordForm.siteExpiry" :disabled="pphsManager.viewOnly" placeholder="e.g. Dec 2027" />
        </el-form-item>
      </div>

      <el-form-item label="Address">
        <el-input v-model="pphsRecordForm.address" :disabled="pphsManager.viewOnly" placeholder="Full street address" />
      </el-form-item>

      <div class="section-label">Coordinates</div>
      <div class="form-row">
        <el-form-item label="Latitude" class="form-item">
          <el-input v-model="pphsRecordForm.lat" :disabled="pphsManager.viewOnly" placeholder="1.3521" />
        </el-form-item>
        <el-form-item label="Longitude" class="form-item">
          <el-input v-model="pphsRecordForm.lng" :disabled="pphsManager.viewOnly" placeholder="103.8198" />
        </el-form-item>
      </div>

      <div v-if="pphsRecordForm.lat && pphsRecordForm.lng" class="coords-preview">
        <span class="coords-icon">🗺️</span>
        <a
          :href="`https://www.google.com/maps?q=${pphsRecordForm.lat},${pphsRecordForm.lng}`"
          target="_blank"
          class="coords-link"
        >
          {{ pphsRecordForm.lat }}, {{ pphsRecordForm.lng }} — Preview on Google Maps ↗
        </a>
      </div>

    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="closeModal">Cancel</el-button>
        <el-button type="primary" @click="submitForm" :disabled="pphsManager.viewOnly">
          {{ isEdit ? 'Save Changes' : 'Create Record' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
/* Header */
.dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dialog-header-icon {
  font-size: 1.6rem;
  flex-shrink: 0;
  line-height: 1;
}

.dialog-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  line-height: 1.2;
}

.dialog-subtitle {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.55;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 340px;
}

/* Form */
.pphs-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-item {
  flex: 1;
  min-width: 0;
}

.section-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.4;
  margin-bottom: 4px;
  margin-top: 4px;
}

/* Coords preview */
.coords-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-top: -8px;
  margin-bottom: 16px;
  font-size: 0.8rem;
}

.coords-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.coords-link {
  color: var(--el-color-primary);
  text-decoration: none;
  opacity: 0.85;
  transition: opacity 0.15s;
}

.coords-link:hover {
  opacity: 1;
  text-decoration: underline;
}

/* Footer */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
