<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { ElMessage } from 'element-plus'

interface MealPhoto {
  uuid: string
  mimeType: string
  blob: string
}

interface MealEntry {
  id: number
  logDate: string
  mealType: string
  plannedName: string
  notes: string | null
  photo: MealPhoto | null
  createdAt: number
}

interface RangeMeal {
  id: number
  mealType: string
  plannedName: string
  notes: string | null
  hasPhoto: boolean
}

interface RangeDay {
  date: string
  meals: RangeMeal[]
}

type ViewMode = 'day' | 'week'

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { value: 'lunch', label: 'Lunch', icon: '☀️' },
  { value: 'dinner', label: 'Dinner', icon: '🌙' },
  { value: 'snack', label: 'Snack', icon: '🍎' },
]

const meals = ref<MealEntry[]>([])
const currentDate = ref(todayStr())
const loading = ref(false)
const loadingId = ref<number | string | null>(null)
const viewMode = ref<ViewMode>('day')

// Week range state
const rangeData = ref<RangeDay[]>([])
const rangeLoading = ref(false)
const rangeMap = computed<Record<string, RangeMeal[]>>(() => {
  const m: Record<string, RangeMeal[]> = {}
  for (const d of rangeData.value) m[d.date] = d.meals
  return m
})

// Quick-add state
const quickAddType = ref<string | null>(null)
const quickAddName = ref('')
const quickAddLoading = ref(false)

// Delete confirmation
const confirmDeleteId = ref<number | null>(null)

// Edit dialog
const showEditDialog = ref(false)
const editForm = ref({ id: 0, plannedName: '', notes: '' })
const editLoading = ref(false)

// File input refs (one per card, keyed by meal id)
const fileInputRefs = ref<Record<number, HTMLInputElement>>({})

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function dateLabel(dateStr: string): string {
  const today = todayStr()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  if (dateStr === tomorrow) return 'Tomorrow'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
}

function shortDayLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric' })
}

// Current week's 7 dates (Mon–Sun) derived from currentDate
const weekDates = computed<string[]>(() => {
  const d = new Date(currentDate.value)
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return day.toISOString().slice(0, 10)
  })
})

const mealTypeMap = computed(() => Object.fromEntries(MEAL_TYPES.map((m) => [m.value, m])))
const photoCount = computed(() => meals.value.filter((m) => m.photo).length)

async function fetchMeals() {
  loading.value = true
  try {
    const { data } = await HttpClient.get(ApiRoute.MEAL.GET_BY_DATE, { params: { date: currentDate.value } })
    meals.value = data.data ?? []
  } catch {
    ElMessage.error('Failed to load meals')
  } finally {
    loading.value = false
  }
}

async function fetchWeekRange() {
  rangeLoading.value = true
  try {
    const { data } = await HttpClient.get(ApiRoute.MEAL.GET_RANGE, {
      params: { from: weekDates.value[0], to: weekDates.value[6] },
    })
    rangeData.value = data.data ?? []
  } catch {
    ElMessage.error('Failed to load week')
  } finally {
    rangeLoading.value = false
  }
}

function shiftDate(days: number) {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + days)
  currentDate.value = d.toISOString().slice(0, 10)
  fetchMeals()
  fetchWeekRange()
}

function shiftWeek(dir: -1 | 1) {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + dir * 7)
  currentDate.value = d.toISOString().slice(0, 10)
  fetchMeals()
  fetchWeekRange()
}

function goToDate(dateStr: string) {
  currentDate.value = dateStr
  viewMode.value = 'day'
  fetchMeals()
}

function goToToday() {
  currentDate.value = todayStr()
  fetchMeals()
  fetchWeekRange()
}

function selectQuickType(type: string) {
  quickAddType.value = quickAddType.value === type ? null : type
  quickAddName.value = ''
}

async function quickAddMeal() {
  if (!quickAddName.value.trim() || !quickAddType.value) return
  quickAddLoading.value = true
  try {
    await HttpClient.post(ApiRoute.MEAL.CREATE, {
      logDate: currentDate.value,
      mealType: quickAddType.value,
      plannedName: quickAddName.value.trim(),
      notes: null,
    })
    quickAddType.value = null
    quickAddName.value = ''
    await fetchMeals()
    await fetchWeekRange()
  } catch {
    ElMessage.error('Failed to add meal')
  } finally {
    quickAddLoading.value = false
  }
}

function openEdit(entry: MealEntry) {
  editForm.value = { id: entry.id, plannedName: entry.plannedName, notes: entry.notes ?? '' }
  showEditDialog.value = true
}

async function saveEdit() {
  if (!editForm.value.plannedName.trim()) return
  editLoading.value = true
  try {
    await HttpClient.post(ApiRoute.MEAL.UPDATE, {
      id: editForm.value.id,
      plannedName: editForm.value.plannedName.trim(),
      notes: editForm.value.notes.trim() || null,
    })
    showEditDialog.value = false
    await fetchMeals()
  } catch {
    ElMessage.error('Failed to update meal')
  } finally {
    editLoading.value = false
  }
}

async function deleteMeal(id: number) {
  loadingId.value = `del-${id}`
  try {
    await HttpClient.post(ApiRoute.MEAL.DELETE, { id })
    confirmDeleteId.value = null
    await fetchMeals()
    await fetchWeekRange()
  } catch {
    ElMessage.error('Failed to delete meal')
  } finally {
    loadingId.value = null
  }
}

function triggerPhotoUpload(id: number) {
  fileInputRefs.value[id]?.click()
}

async function onFileSelected(entry: MealEntry, event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  loadingId.value = `photo-${entry.id}`
  try {
    const blob = await compressImage(file)
    await HttpClient.post(ApiRoute.MEAL.UPLOAD_PHOTO, {
      mealLogId: entry.id,
      name: file.name,
      mimeType: 'image/jpeg',
      sizeInBytes: file.size,
      blob,
    })
    await fetchMeals()
    await fetchWeekRange()
  } catch {
    ElMessage.error('Failed to upload photo')
  } finally {
    loadingId.value = null
    if (fileInputRefs.value[entry.id]) fileInputRefs.value[entry.id].value = ''
  }
}

async function deletePhoto(mealLogId: number) {
  loadingId.value = `photodel-${mealLogId}`
  try {
    await HttpClient.post(ApiRoute.MEAL.DELETE_PHOTO, { mealLogId })
    await fetchMeals()
    await fetchWeekRange()
  } catch {
    ElMessage.error('Failed to remove photo')
  } finally {
    loadingId.value = null
  }
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 800
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width)
          width = MAX
        } else {
          width = Math.round((width * MAX) / height)
          height = MAX
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.src = url
  })
}

watch(currentDate, () => {
  quickAddType.value = null
  confirmDeleteId.value = null
})

onMounted(() => {
  fetchMeals()
  fetchWeekRange()
})
</script>

<template>
  <div class="page-container meal-page">
    <!-- Header -->
    <div class="meal-header">
      <h1 class="meal-title">Meal Prep</h1>
      <p class="meal-subtitle">Track your planned and actual meals</p>
    </div>

    <!-- Day / Week toggle -->
    <div class="view-toggle">
      <el-segmented
        v-model="viewMode"
        :options="[{ label: 'Day', value: 'day' }, { label: 'Week', value: 'week' }]"
      />
    </div>

    <!-- Week strip -->
    <div class="week-strip">
      <el-button text class="strip-arrow" @click="shiftWeek(-1)">‹</el-button>
      <div class="strip-days">
        <div
          v-for="dateStr in weekDates"
          :key="dateStr"
          class="strip-day"
          :class="{ 'strip-day--active': dateStr === currentDate, 'strip-day--today': dateStr === todayStr() }"
          @click="goToDate(dateStr)"
        >
          <span class="strip-day-label">{{ shortDayLabel(dateStr) }}</span>
          <span class="strip-dot" :class="{ 'strip-dot--visible': (rangeMap[dateStr]?.length ?? 0) > 0 }" />
        </div>
      </div>
      <el-button text class="strip-arrow" @click="shiftWeek(1)">›</el-button>
    </div>
    <div class="strip-today-row">
      <el-button text size="small" @click="goToToday">Today</el-button>
    </div>

    <!-- DAY VIEW -->
    <template v-if="viewMode === 'day'">
      <div class="date-nav">
        <el-button text @click="shiftDate(-1)">‹</el-button>
        <span class="date-label">{{ dateLabel(currentDate) }}</span>
        <el-button text @click="shiftDate(1)">›</el-button>
      </div>

      <!-- Quick-add pills -->
      <div class="quick-add-row">
        <button
          v-for="t in MEAL_TYPES"
          :key="t.value"
          class="meal-pill"
          :class="{ 'meal-pill--active': quickAddType === t.value }"
          @click="selectQuickType(t.value)"
        >{{ t.icon }} {{ t.label }}</button>
      </div>

      <!-- Quick-add input -->
      <Transition name="expand">
        <div v-if="quickAddType" class="quick-add-input-row">
          <el-input
            v-model="quickAddName"
            :placeholder="`What are you having for ${mealTypeMap[quickAddType]?.label}?`"
            maxlength="256"
            autofocus
            @keyup.enter="quickAddMeal"
          />
          <el-button
            type="primary"
            :loading="quickAddLoading"
            :disabled="!quickAddName.trim()"
            @click="quickAddMeal"
          >✓</el-button>
          <el-button @click="quickAddType = null">✕</el-button>
        </div>
      </Transition>

      <p v-if="!loading && meals.length > 0" class="meal-summary">
        {{ meals.length }} planned<span v-if="photoCount > 0"> · {{ photoCount }} logged with photo</span>
      </p>

      <!-- Loading -->
      <div v-if="loading" class="meal-loading">
        <el-skeleton :rows="3" animated />
      </div>

      <!-- Empty state -->
      <div v-else-if="meals.length === 0" class="meal-empty">
        <p>No meals planned for {{ dateLabel(currentDate) }}.</p>
      </div>

      <!-- Meal cards -->
      <div v-else class="meal-list">
        <div v-for="entry in meals" :key="entry.id" class="meal-card">
          <div class="meal-card-header">
            <span class="meal-type-badge">
              {{ mealTypeMap[entry.mealType]?.icon ?? '🍽' }}
              {{ mealTypeMap[entry.mealType]?.label ?? entry.mealType }}
            </span>
            <div class="meal-card-actions">
              <el-button text size="small" @click="openEdit(entry)">Edit</el-button>
              <el-button
                v-if="confirmDeleteId !== entry.id"
                text size="small" type="danger"
                @click="confirmDeleteId = entry.id"
              >🗑</el-button>
            </div>
          </div>

          <Transition name="expand">
            <div v-if="confirmDeleteId === entry.id" class="meal-delete-confirm">
              <span class="meal-delete-label">Remove "{{ entry.plannedName }}"?</span>
              <div class="meal-delete-actions">
                <el-button size="small" @click="confirmDeleteId = null">Cancel</el-button>
                <el-button
                  size="small"
                  type="danger"
                  :loading="loadingId === `del-${entry.id}`"
                  @click="deleteMeal(entry.id)"
                >Delete</el-button>
              </div>
            </div>
          </Transition>

          <p class="meal-name">{{ entry.plannedName }}</p>
          <p v-if="entry.notes" class="meal-notes">{{ entry.notes }}</p>

          <div class="meal-divider" />

          <!-- Photo section -->
          <div v-if="entry.photo" class="meal-photo-section">
            <img :src="entry.photo.blob" class="meal-photo" alt="Actual meal" />
            <el-button
              text
              size="small"
              type="danger"
              class="meal-photo-remove"
              :loading="loadingId === `photodel-${entry.id}`"
              @click="deletePhoto(entry.id)"
            >✕ Remove</el-button>
          </div>
          <div v-else class="meal-photo-section meal-photo-section--empty">
            <input
              type="file"
              accept="image/*"
              :ref="(el) => { if (el) fileInputRefs[entry.id] = el as HTMLInputElement }"
              style="display: none"
              @change="(e) => onFileSelected(entry, e)"
            />
            <el-button
              size="small"
              plain
              :loading="loadingId === `photo-${entry.id}`"
              @click="triggerPhotoUpload(entry.id)"
            >📷 Log actual meal</el-button>
          </div>
        </div>
      </div>
    </template>

    <!-- WEEK VIEW -->
    <template v-else>
      <div v-if="rangeLoading" class="meal-loading">
        <el-skeleton :rows="7" animated />
      </div>
      <div v-else class="week-list">
        <div
          v-for="dateStr in weekDates"
          :key="dateStr"
          class="week-row"
          :class="{ 'week-row--today': dateStr === todayStr() }"
          @click="goToDate(dateStr)"
        >
          <span class="week-row-date">{{ shortDayLabel(dateStr) }}</span>
          <span v-if="(rangeMap[dateStr]?.length ?? 0) === 0" class="week-row-empty">—</span>
          <div v-else class="week-row-meals">
            <span v-for="meal in rangeMap[dateStr]" :key="meal.id" class="week-chip">
              {{ mealTypeMap[meal.mealType]?.icon ?? '🍽' }}
              {{ meal.plannedName }}
              <span v-if="meal.hasPhoto">📷</span>
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- Edit meal dialog -->
    <el-dialog v-model="showEditDialog" title="Edit meal" width="360px" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent="saveEdit">
        <el-form-item label="Planned meal">
          <el-input
            v-model="editForm.plannedName"
            placeholder="e.g. Oatmeal with berries"
            maxlength="256"
            show-word-limit
            autofocus
          />
        </el-form-item>
        <el-form-item label="Notes (optional)">
          <el-input
            v-model="editForm.notes"
            type="textarea"
            placeholder="e.g. low sugar, no salt"
            :rows="2"
            maxlength="512"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">Cancel</el-button>
        <el-button
          type="primary"
          :loading="editLoading"
          :disabled="!editForm.plannedName.trim()"
          @click="saveEdit"
        >Save</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.meal-page {
  max-width: 640px;
}

.meal-header {
  text-align: center;
  padding: 24px 16px 20px;
}

.meal-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--color-heading);
}

.meal-subtitle {
  margin-top: 6px;
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.6;
}

.view-toggle {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

/* Week strip */
.week-strip {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 0 2px 4px;
}

.strip-arrow {
  flex-shrink: 0;
  padding: 0 2px;
  font-size: 1.2rem;
}

.strip-days {
  display: flex;
  flex: 1;
  justify-content: space-between;
}

.strip-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 8px;
  transition: background 0.15s;
}

.strip-day:hover {
  background: var(--color-background-mute);
}

.strip-day--active {
  background: var(--el-color-primary-light-9);
}

.strip-day--active .strip-day-label {
  color: var(--el-color-primary);
  font-weight: 700;
}

.strip-day-label {
  font-size: 0.72rem;
  color: var(--color-text);
  white-space: nowrap;
}

.strip-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: transparent;
  transition: background 0.15s;
}

.strip-dot--visible {
  background: var(--el-color-primary);
}

.strip-today-row {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

/* Date nav */
.date-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 4px 12px;
}

.date-label {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-heading);
  min-width: 140px;
  text-align: center;
}

/* Quick-add pills */
.quick-add-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 0 12px;
}

.meal-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.meal-pill:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.meal-pill--active {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
  font-weight: 600;
}

/* Quick-add input */
.quick-add-input-row {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 12px;
}

.expand-enter-active,
.expand-leave-active {
  transition: opacity 0.15s, max-height 0.2s;
  max-height: 60px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.meal-summary {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.6;
  margin: 0 0 12px;
}

.meal-loading {
  padding: 16px 0;
}

.meal-empty {
  text-align: center;
  padding: 48px 16px;
  color: var(--color-text);
  opacity: 0.65;
}

.meal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meal-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  background: var(--color-background-soft);
}

.meal-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.meal-type-badge {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--el-color-primary);
}

.meal-card-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.meal-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 4px;
}

.meal-notes {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.7;
  margin: 0;
}

.meal-divider {
  border-top: 1px solid var(--color-border);
  margin: 12px 0;
}

.meal-photo-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meal-photo-section--empty {
  align-items: flex-start;
}

.meal-photo {
  width: 100%;
  border-radius: 8px;
  object-fit: cover;
  max-height: 280px;
}

.meal-photo-remove {
  align-self: flex-end;
}

.meal-delete-confirm {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: var(--el-color-danger-light-9);
  border: 1px solid var(--el-color-danger-light-5);
}

.meal-delete-label {
  font-size: 0.82rem;
  color: var(--el-color-danger);
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meal-delete-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* Week view */
.week-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.week-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s;
}

.week-row:hover {
  background: var(--color-background-mute);
}

.week-row--today {
  border-color: var(--el-color-primary);
}

.week-row-date {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-heading);
  min-width: 56px;
  flex-shrink: 0;
  padding-top: 2px;
}

.week-row-empty {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.35;
}

.week-row-meals {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.week-chip {
  font-size: 0.78rem;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}
</style>
