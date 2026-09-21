<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Picture } from '@element-plus/icons-vue'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { TRAVEL_CATEGORIES } from '@/constants/TravelCategories'
import { parseImages } from '@/composables/useActivitySuggestions'

const router = useRouter()
const { t } = useI18n()

type Kind = 'activity' | 'place'
const activeTab = ref<Kind>('place')

interface ActivityRow {
  id: number
  destination_tag: string
  title: string
  category: string | null
  estimated_hours: number | null
  description: string | null
  images_json: string | null
}
interface PlaceRow {
  id: number
  destination_tag: string
  title: string
  category: string | null
  description: string | null
  images_json: string | null
  lat: number
  lng: number
}

const activities = ref<ActivityRow[]>([])
const places = ref<PlaceRow[]>([])
const loading = ref(true)

async function loadAll() {
  loading.value = true
  const [actRes, placeRes] = await Promise.allSettled([
    HttpClient.get(ApiRoute.SUGGESTION.ADMIN_ACTIVITIES),
    HttpClient.get(ApiRoute.SUGGESTION.ADMIN_PLACES),
  ])
  activities.value = actRes.status === 'fulfilled' ? (actRes.value.data?.data ?? []) : []
  places.value = placeRes.status === 'fulfilled' ? (placeRes.value.data?.data ?? []) : []
  loading.value = false
}
onMounted(loadAll)

// ── Edit dialog ──────────────────────────────────────────────────────────
const dialogVisible = ref(false)
const dialogIsNew = ref(true)
const dialogKind = ref<Kind>('place')
const saving = ref(false)

interface FormState {
  id: number | null
  destinationTag: string
  title: string
  category: string
  description: string
  images: string[]
  estimatedHours: number | undefined
  lat: number | undefined
  lng: number | undefined
}

const emptyForm = (): FormState => ({
  id: null, destinationTag: '', title: '', category: '', description: '',
  images: [], estimatedHours: undefined, lat: undefined, lng: undefined,
})

const form = ref<FormState>(emptyForm())

function openCreate(kind: Kind) {
  dialogKind.value = kind
  dialogIsNew.value = true
  form.value = emptyForm()
  dialogVisible.value = true
}

function openEdit(kind: Kind, row: ActivityRow | PlaceRow) {
  dialogKind.value = kind
  dialogIsNew.value = false
  form.value = {
    id: row.id,
    destinationTag: row.destination_tag,
    title: row.title,
    category: row.category ?? '',
    description: row.description ?? '',
    images: parseImages(row.images_json),
    estimatedHours: kind === 'activity' ? (row as ActivityRow).estimated_hours ?? undefined : undefined,
    lat: kind === 'place' ? (row as PlaceRow).lat : undefined,
    lng: kind === 'place' ? (row as PlaceRow).lng : undefined,
  }
  dialogVisible.value = true
}

function addImageField() { form.value.images.push('') }
function removeImageField(i: number) { form.value.images.splice(i, 1) }

const canSave = computed(() => {
  if (!form.value.destinationTag.trim() || !form.value.title.trim()) return false
  if (dialogKind.value === 'place' && (form.value.lat === undefined || form.value.lng === undefined)) return false
  return true
})

async function save() {
  if (!canSave.value) return
  saving.value = true
  const images = form.value.images.map((i) => i.trim()).filter(Boolean)
  try {
    if (dialogKind.value === 'activity') {
      const payload = {
        destinationTag: form.value.destinationTag.trim(),
        title: form.value.title.trim(),
        category: form.value.category || undefined,
        description: form.value.description || undefined,
        estimatedHours: form.value.estimatedHours,
        images,
      }
      if (dialogIsNew.value) await HttpClient.post(ApiRoute.SUGGESTION.CREATE_ACTIVITY, payload)
      else await HttpClient.put(ApiRoute.SUGGESTION.UPDATE_ACTIVITY(form.value.id!), payload)
    } else {
      const payload = {
        destinationTag: form.value.destinationTag.trim(),
        title: form.value.title.trim(),
        category: form.value.category || undefined,
        description: form.value.description || undefined,
        lat: form.value.lat,
        lng: form.value.lng,
        images,
      }
      if (dialogIsNew.value) await HttpClient.post(ApiRoute.SUGGESTION.CREATE_PLACE, payload)
      else await HttpClient.put(ApiRoute.SUGGESTION.UPDATE_PLACE(form.value.id!), payload)
    }
    ElMessage.success(t('toast.adminSuggestionSaved'))
    dialogVisible.value = false
    await loadAll()
  } catch {
    ElMessage.error(t('toast.adminSuggestionFailed'))
  } finally {
    saving.value = false
  }
}

async function removeRow(kind: Kind, row: ActivityRow | PlaceRow) {
  try {
    await ElMessageBox.confirm(t('admin.suggestions.deleteConfirm', { title: row.title }), t('admin.suggestions.deleteTitle'), {
      confirmButtonText: t('admin.suggestions.deleteConfirmBtn'),
      cancelButtonText: t('travel.createTrip.cancel'),
      type: 'warning',
    })
  } catch {
    return // cancelled
  }
  try {
    if (kind === 'activity') await HttpClient.delete(ApiRoute.SUGGESTION.DELETE_ACTIVITY(row.id))
    else await HttpClient.delete(ApiRoute.SUGGESTION.DELETE_PLACE(row.id))
    ElMessage.success(t('admin.suggestions.deleted'))
    await loadAll()
  } catch {
    ElMessage.error(t('toast.adminSuggestionFailed'))
  }
}
</script>

<template>
  <div class="suggestion-admin-page">

    <header class="suggestion-admin-header">
      <el-button text size="small" class="back-btn" @click="router.push('/admin')">← Admin</el-button>
      <h2 class="suggestion-admin-title">{{ t('admin.suggestions.title') }}</h2>
    </header>

    <div class="suggestion-admin-body" v-loading="loading">
      <el-tabs v-model="activeTab">

        <!-- ── Places ── -->
        <el-tab-pane :label="t('travel.places.title')" name="place">
          <div class="admin-toolbar">
            <el-button type="primary" :icon="Plus" size="small" @click="openCreate('place')">{{ t('admin.suggestions.addPlace') }}</el-button>
          </div>
          <el-table :data="places" size="small" class="admin-table">
            <el-table-column prop="destination_tag" :label="t('admin.suggestions.destination')" width="140" />
            <el-table-column :label="t('admin.suggestions.titleCol')">
              <template #default="{ row }">
                <div class="row-title-cell">
                  <el-icon v-if="parseImages(row.images_json).length" class="row-image-icon"><Picture /></el-icon>
                  {{ row.title }}
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="category" :label="t('admin.suggestions.categoryCol')" width="120" />
            <el-table-column :label="t('admin.suggestions.actionsCol')" width="110">
              <template #default="{ row }">
                <el-button circle size="small" :icon="Edit" @click="openEdit('place', row)" />
                <el-button circle size="small" :icon="Delete" type="danger" plain @click="removeRow('place', row)" />
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- ── Activities ── -->
        <el-tab-pane :label="t('travel.todo.title')" name="activity">
          <div class="admin-toolbar">
            <el-button type="primary" :icon="Plus" size="small" @click="openCreate('activity')">{{ t('admin.suggestions.addActivity') }}</el-button>
          </div>
          <el-table :data="activities" size="small" class="admin-table">
            <el-table-column prop="destination_tag" :label="t('admin.suggestions.destination')" width="140" />
            <el-table-column :label="t('admin.suggestions.titleCol')">
              <template #default="{ row }">
                <div class="row-title-cell">
                  <el-icon v-if="parseImages(row.images_json).length" class="row-image-icon"><Picture /></el-icon>
                  {{ row.title }}
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="category" :label="t('admin.suggestions.categoryCol')" width="120" />
            <el-table-column :label="t('admin.suggestions.actionsCol')" width="110">
              <template #default="{ row }">
                <el-button circle size="small" :icon="Edit" @click="openEdit('activity', row)" />
                <el-button circle size="small" :icon="Delete" type="danger" plain @click="removeRow('activity', row)" />
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

      </el-tabs>
    </div>

    <!-- ── Create/edit dialog ── -->
    <el-dialog v-model="dialogVisible" :title="dialogIsNew ? t('admin.suggestions.addTitle') : t('admin.suggestions.editTitle')" width="480px">
      <el-form label-position="top">
        <el-form-item :label="t('admin.suggestions.destination')" required>
          <el-input v-model="form.destinationTag" :placeholder="t('admin.suggestions.destinationPlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('admin.suggestions.titleCol')" required>
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item :label="t('admin.suggestions.categoryCol')">
          <el-select v-model="form.category" clearable style="width: 100%">
            <el-option v-for="c in TRAVEL_CATEGORIES" :key="c.value" :value="c.value" :label="t(c.labelKey)" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="dialogKind === 'activity'" :label="t('admin.suggestions.estimatedHours')">
          <el-input-number v-model="form.estimatedHours" :min="0" :step="0.5" style="width: 100%" />
        </el-form-item>
        <template v-if="dialogKind === 'place'">
          <div class="form-row">
            <el-form-item label="Lat" required style="flex: 1">
              <el-input-number v-model="form.lat" :precision="6" :controls="false" style="width: 100%" />
            </el-form-item>
            <el-form-item label="Lng" required style="flex: 1">
              <el-input-number v-model="form.lng" :precision="6" :controls="false" style="width: 100%" />
            </el-form-item>
          </div>
        </template>
        <el-form-item :label="t('admin.suggestions.descriptionCol')">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item :label="t('admin.suggestions.imagesLabel')">
          <div class="image-field-list">
            <div v-for="(img, i) in form.images" :key="i" class="image-field-row">
              <el-input v-model="form.images[i]" placeholder="https://…" />
              <el-button circle size="small" :icon="Delete" @click="removeImageField(i)" />
            </div>
            <el-button size="small" :icon="Plus" @click="addImageField">{{ t('admin.suggestions.addImage') }}</el-button>
            <p class="image-field-hint">{{ t('admin.suggestions.imagesHint') }}</p>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('travel.createTrip.cancel') }}</el-button>
        <el-button type="primary" :disabled="!canSave" :loading="saving" @click="save">{{ t('admin.suggestions.save') }}</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<style scoped>
.suggestion-admin-page {
  width: 100%;
  min-height: calc(100vh - 80px);
  background: var(--color-background);
  overflow-y: auto;
}

.suggestion-admin-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 32px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
  min-height: 52px;
}

.back-btn {
  opacity: 0.55;
  font-size: 0.82rem;
  padding: 14px 0;
}
.back-btn:hover { opacity: 1; }

.suggestion-admin-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
}

.suggestion-admin-body {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
}

.admin-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.admin-table {
  width: 100%;
}

.row-title-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.row-image-icon {
  color: var(--el-color-primary);
  opacity: 0.7;
}

.form-row {
  display: flex;
  gap: 12px;
}

.image-field-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.image-field-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.image-field-hint {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.5;
  margin: 2px 0 0;
}
</style>
