<script lang="ts" setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadUserFile } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { TRAVEL_CATEGORIES } from '@/constants/TravelCategories'
import { searchPlaces, type Place } from '@/composables/useGeocode'
import type { AgendaItem } from '@/interfaces/forms/itinerary/AgendaItem'
import { FileWithPreview } from '@/interfaces/forms/itinerary/FileWithPreview'
import { FileUtils } from '@/utilities/FileUtils'

const props = defineProps<{
  modelValue: boolean
  item: AgendaItem | null
  isNew: boolean
  drawerDirection: 'rtl' | 'btt'
  drawerSize: string
  startDate?: number
  endDate?: number
  unknownDate?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [item: AgendaItem]
  'cancel': []
}>()

const makeBlankDraft = (): AgendaItem => ({
  _localIndex: `agenda-${Date.now()}`,
  category: undefined,
  title: '',
  desc: '',
  date: '',
  city: '',
  cityRaw: [],
  coordinates: undefined,
  placeDisplay: undefined,
  unknownTime: true,
  startTime: undefined,
  endTime: undefined,
  files: [],
  _fileIdsToDelete: [],
  _fileIdsToInsert: [],
  _agendaToFileMapping: [],
})

// ── Place search ──────────────────────────────────────────────────────────────
const placeOptions = ref<Place[]>([])
const placeLoading = ref(false)
let placeDebounce: ReturnType<typeof setTimeout> | null = null

const onPlaceSearch = (query: string) => {
  if (placeDebounce) clearTimeout(placeDebounce)
  if (!query.trim()) { placeOptions.value = []; return }
  placeLoading.value = true
  placeDebounce = setTimeout(async () => {
    placeOptions.value = await searchPlaces(query)
    placeLoading.value = false
  }, 400)
}

const onPlaceSelect = (placeId: string) => {
  const place = placeOptions.value.find((p) => p.placeId === placeId)
  if (!place) return
  drawerForm.value.placeDisplay = place.displayName
  drawerForm.value.coordinates = { lat: place.lat, lng: place.lng }
  drawerForm.value.cityRaw = [place.displayName]
  drawerForm.value.city = JSON.stringify([place.displayName])
}

const clearPlace = () => {
  drawerForm.value.placeDisplay = undefined
  drawerForm.value.coordinates = undefined
  drawerForm.value.cityRaw = []
  drawerForm.value.city = ''
  placeOptions.value = []
}

const FILE_LIMIT = 2
const FILE_MAX_BYTES = 5 * 1024 * 1024

const drawerForm = ref<AgendaItem>(makeBlankDraft())
const uploadFileList = ref<UploadUserFile[]>([])
const uidToUuidMap = new Map<number, string>()

const syncUploadList = (files: FileWithPreview[]) => {
  uidToUuidMap.clear()
  uploadFileList.value = files.map((f, i) => {
    const uid = Date.now() + i
    uidToUuidMap.set(uid, f.uuid)
    return {
      uid,
      name: f.name,
      url: f.blob ?? f.previewUrl,
      status: (f.status === 'uploaded' ? 'success' : 'ready') as UploadUserFile['status'],
    }
  })
}

watch(() => props.item, (newItem) => {
  if (newItem) {
    drawerForm.value = { ...newItem }
    syncUploadList(newItem.files ?? [])
  } else {
    drawerForm.value = makeBlankDraft()
    syncUploadList([])
  }
}, { immediate: true })

watch(() => props.modelValue, (val) => {
  if (!val) return
  if (props.item) {
    drawerForm.value = { ...props.item }
    syncUploadList(props.item.files ?? [])
  } else {
    drawerForm.value = makeBlankDraft()
    syncUploadList([])
  }
})

const validateImageFile = (file: File): boolean => {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('Only image files are allowed')
    return false
  }
  if (file.size > FILE_MAX_BYTES) {
    ElMessage.error(`${file.name} exceeds 5 MB`)
    return false
  }
  return true
}

const handleBeforeUpload = (file: File): boolean => validateImageFile(file)

const handleFileChange = async (uploadFile: UploadFile) => {
  if (!uploadFile.raw) return
  if (!validateImageFile(uploadFile.raw)) {
    uploadFileList.value = uploadFileList.value.filter((f) => f.uid !== uploadFile.uid)
    return
  }

  const fwp = new FileWithPreview(uploadFile.raw)
  fwp.blob = await FileUtils.convertFileToBase64(uploadFile.raw)

  uidToUuidMap.set(uploadFile.uid, fwp.uuid)
  drawerForm.value.files = [...drawerForm.value.files, fwp]
  drawerForm.value._fileIdsToInsert = [...drawerForm.value._fileIdsToInsert, fwp.uuid]
}

const handleFileRemove = (uploadFile: UploadFile) => {
  const uuid = uidToUuidMap.get(uploadFile.uid) ?? String(uploadFile.uid)
  const removing = drawerForm.value.files.find((f) => f.uuid === uuid)

  if (removing?.status === 'uploaded') {
    drawerForm.value._fileIdsToDelete = [...drawerForm.value._fileIdsToDelete, removing.uuid]
  } else {
    drawerForm.value._fileIdsToInsert = drawerForm.value._fileIdsToInsert.filter((id) => id !== uuid)
  }

  drawerForm.value.files = drawerForm.value.files.filter((f) => f.uuid !== uuid)
  uidToUuidMap.delete(uploadFile.uid)
}

const handleExceed = () => {
  ElMessage.warning(`Maximum ${FILE_LIMIT} images per agenda item`)
}


const drawerDisabledDate = (time: Date) => {
  const { startDate, endDate, unknownDate } = props
  if (unknownDate || (!startDate && !endDate)) return false
  const t = time.getTime()
  const toMid = (ts: number) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime() }
  if (startDate && t < toMid(startDate)) return true
  if (endDate && t > toMid(endDate)) return true
  return false
}

const save = () => {
  if (!drawerForm.value.title.trim()) {
    ElMessage.warning('Please enter a title.')
    return
  }
  emit('save', { ...drawerForm.value })
  emit('update:modelValue', false)
}

const cancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    :title="isNew ? 'New Agenda Item' : 'Edit Item'"
    :direction="drawerDirection"
    :size="drawerSize"
  >
    <div class="drawer-form">

      <!-- Category -->
      <div class="form-section">
        <div class="form-label">Category</div>
        <div class="category-grid">
          <button v-for="cat in TRAVEL_CATEGORIES" :key="cat.value" class="cat-btn"
            :class="{ active: drawerForm.category === cat.value }" @click="drawerForm.category = cat.value">
            <span class="cat-emoji">{{ cat.emoji }}</span>
            <span class="cat-label">{{ cat.label }}</span>
          </button>
        </div>
      </div>

      <!-- Title -->
      <div class="form-section">
        <div class="form-label">Title <span class="req">*</span></div>
        <el-input v-model="drawerForm.title" placeholder="e.g. Lunch at local restaurant" size="large" />
      </div>

      <!-- Date -->
      <div class="form-section">
        <div class="form-label">Date</div>
        <el-date-picker v-model="drawerForm.date" type="date" placeholder="Select date" style="width: 100%"
          value-format="YYYY-MM-DD" :disabled-date="drawerDisabledDate"
          :default-value="startDate ? new Date(startDate) : undefined" size="large" />
      </div>

      <!-- Place search -->
      <div class="form-section">
        <div class="form-label">Place</div>
        <div v-if="drawerForm.placeDisplay" class="place-selected">
          <span class="place-selected-text">📍 {{ drawerForm.placeDisplay }}</span>
          <el-button link size="small" @click="clearPlace" class="place-clear">✕</el-button>
        </div>
        <el-select
          v-else
          style="width: 100%"
          size="large"
          filterable
          remote
          :remote-method="onPlaceSearch"
          :loading="placeLoading"
          placeholder="Search for a place, landmark, city…"
          value-key="placeId"
          @change="onPlaceSelect"
        >
          <el-option
            v-for="place in placeOptions"
            :key="place.placeId"
            :label="place.displayName"
            :value="place.placeId"
          >
            <span style="font-weight: 500">{{ place.shortName }}</span>
            <span style="font-size: 0.78rem; color: var(--el-text-color-secondary); margin-left: 6px">
              {{ place.displayName }}
            </span>
          </el-option>
        </el-select>
      </div>

      <!-- Time -->
      <div class="form-section">
        <div class="form-label">Time</div>
        <div class="time-row">
          <el-time-picker v-model="drawerForm.startTime" placeholder="Start" style="flex: 1" format="HH:mm"
            value-format="HH:mm" :disabled="drawerForm.unknownTime" size="large" />
          <span class="time-sep">–</span>
          <el-time-picker v-model="drawerForm.endTime" placeholder="End" style="flex: 1" format="HH:mm"
            value-format="HH:mm" :disabled="drawerForm.unknownTime" size="large" />
        </div>
        <el-checkbox v-model="drawerForm.unknownTime" style="margin-top: 6px">
          Time TBC
        </el-checkbox>
      </div>

      <!-- Notes -->
      <div class="form-section">
        <div class="form-label">Notes</div>
        <el-input v-model="drawerForm.desc" type="textarea" :rows="3" placeholder="Any notes or details..."
          size="large" />
      </div>

      <!-- Budget -->
      <div class="form-section">
        <div class="form-label">Budget</div>
        <el-input-number v-model="drawerForm.budget" :min="0" style="width: 100%" size="large" placeholder="0.00" />
      </div>

      <!-- Images -->
      <div class="form-section">
        <div class="form-label">Images</div>
        <el-upload
          v-model:file-list="uploadFileList"
          list-type="picture-card"
          :auto-upload="false"
          accept="image/*"
          :limit="FILE_LIMIT"
          :before-upload="handleBeforeUpload"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :on-exceed="handleExceed"
        >
          <el-icon><Plus /></el-icon>
          <template #tip>
            <div class="el-upload__tip">Images only · max {{ FILE_LIMIT }} · 5 MB each</div>
          </template>
        </el-upload>
      </div>

      <!-- Actions -->
      <div class="drawer-actions">
        <el-button style="flex: 1" @click="cancel">Cancel</el-button>
        <el-button style="flex: 1" type="primary" @click="save">
          {{ isNew ? 'Add Item' : 'Save Changes' }}
        </el-button>
      </div>

    </div>
  </el-drawer>
</template>

<style scoped>
.drawer-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.drawer-actions {
  display: flex;
  gap: 8px;
  position: sticky;
  bottom: 0;
  padding: 16px 0 8px;
  background: var(--el-drawer-bg-color, var(--color-background-soft));
}

.form-section {
  margin-bottom: 18px;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.7;
  margin-bottom: 6px;
}

.req {
  color: #f87171;
}

/* Category grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.cat-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 4px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}

.cat-btn:hover {
  border-color: var(--el-color-primary);
  background: var(--color-background-mute);
}

.cat-btn.active {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}

.cat-emoji {
  font-size: 1.3rem;
  line-height: 1;
}

.cat-label {
  font-size: 0.68rem;
  color: var(--color-text);
  font-weight: 500;
}

/* Place selected */
.place-selected {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  background: var(--color-background-soft);
}

.place-selected-text {
  flex: 1;
  font-size: 0.9rem;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.place-clear {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

/* Time row */
.time-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-sep {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.5;
  flex-shrink: 0;
}
</style>
