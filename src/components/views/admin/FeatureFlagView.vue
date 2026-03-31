<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { useRouter } from 'vue-router'

const router = useRouter()

interface FlagRecord {
  id: number
  key: string
  label: string
  isEnabled: boolean
  remarks: string | null
  updatedDt: number | null
  updatedBy: string | null
  createdDt: number
  createdBy: string
}

// ── State ─────────────────────────────────────────────────────────────────────

const flags = ref<FlagRecord[]>([])
const loading = ref(true)
const toggling = ref<Record<string, boolean>>({})

// Drawer — edit
const drawerVisible = ref(false)
const selectedFlag = ref<FlagRecord | null>(null)
const draftLabel = ref('')
const draftRemarks = ref('')
const saving = ref(false)

// Dialog — create
const createVisible = ref(false)
const createForm = ref({ key: '', label: '', remarks: '' })
const creating = ref(false)

// ── Stats ─────────────────────────────────────────────────────────────────────

const sortAlpha = ref(false)

const sortedFlags = computed(() => {
  if (!sortAlpha.value) return flags.value
  return [...flags.value].sort((a, b) => a.key.localeCompare(b.key))
})

const enabledCount  = computed(() => flags.value.filter(f => f.isEnabled).length)
const disabledCount = computed(() => flags.value.filter(f => !f.isEnabled).length)

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDt = (ts: number | null) => {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const flagKey = (key: string) => key.replace(/_/g, '_\u200B') // allow wrap at underscores

// ── Fetch ─────────────────────────────────────────────────────────────────────

const fetchFlags = async () => {
  loading.value = true
  const res = await HttpClient.get(ApiRoute.ADMIN.LIST_FLAGS).catch(() => null)
  if (res?.data?.data) {
    flags.value = res.data.data
  } else {
    ElMessage.error('Failed to load feature flags.')
  }
  loading.value = false
}

onMounted(fetchFlags)

// ── Toggle ────────────────────────────────────────────────────────────────────

const toggleFlag = async (flag: FlagRecord) => {
  if (toggling.value[flag.key]) return
  toggling.value[flag.key] = true

  const prev = flag.isEnabled
  flag.isEnabled = !prev // optimistic

  const res = await HttpClient.post(ApiRoute.ADMIN.TOGGLE_FLAG(flag.key), {}).catch(() => null)
  toggling.value[flag.key] = false

  if (res?.data?.data) {
    flag.isEnabled = res.data.data.is_enabled
    flag.updatedBy = null  // server updates these; reflect on next full fetch
    flag.updatedDt = Date.now()
  } else {
    flag.isEnabled = prev // revert
    ElMessage.error('Failed to toggle flag.')
  }
}

// ── Edit ──────────────────────────────────────────────────────────────────────

const openEdit = (flag: FlagRecord) => {
  selectedFlag.value = flag
  draftLabel.value   = flag.label
  draftRemarks.value = flag.remarks ?? ''
  drawerVisible.value = true
}

const saveEdit = async () => {
  if (!selectedFlag.value || !draftLabel.value.trim()) return
  saving.value = true
  const res = await HttpClient.post(ApiRoute.ADMIN.UPDATE_FLAG(selectedFlag.value.key), {
    label:   draftLabel.value.trim(),
    remarks: draftRemarks.value.trim() || null,
  }).catch(() => null)
  saving.value = false

  if (res?.data?.data?.updated) {
    selectedFlag.value.label   = draftLabel.value.trim()
    selectedFlag.value.remarks = draftRemarks.value.trim() || null
    selectedFlag.value.updatedDt = Date.now()
    ElMessage.success('Flag updated.')
    drawerVisible.value = false
  } else {
    ElMessage.error('Failed to update flag.')
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

const openCreate = () => {
  createForm.value = { key: '', label: '', remarks: '' }
  createVisible.value = true
}

const submitCreate = async () => {
  const key   = createForm.value.key.trim().toLowerCase().replace(/[\s_]+/g, '-')
  const label = createForm.value.label.trim()
  if (!key || !label) return

  creating.value = true
  const res = await HttpClient.post(ApiRoute.ADMIN.CREATE_FLAG, {
    key,
    label,
    remarks: createForm.value.remarks.trim() || null,
  }).catch(() => null)
  creating.value = false

  if (res?.data?.data) {
    flags.value.push(res.data.data)
    ElMessage.success('Flag created (disabled by default).')
    createVisible.value = false
  } else {
    ElMessage.error('Failed to create flag. Key may already exist.')
  }
}
</script>

<template>
  <div class="ff-root page-container" v-loading="loading">

    <!-- Header -->
    <div class="ff-header">
      <div class="ff-header-left">
        <el-button text size="small" @click="router.push('/admin')" class="ff-back">
          ← Admin
        </el-button>
        <h1 class="ff-title">Feature Flags</h1>
        <p class="ff-subtitle">{{ flags.length }} flags · {{ enabledCount }} enabled · {{ disabledCount }} disabled</p>
      </div>
      <div style="display:flex;gap:8px">
        <el-button size="small" :type="sortAlpha ? 'primary' : ''" @click="sortAlpha = !sortAlpha">A–Z</el-button>
        <el-button type="primary" size="small" @click="openCreate">+ New Flag</el-button>
      </div>
    </div>

    <!-- Summary pills -->
    <div class="ff-summary">
      <div class="ff-pill ff-pill--on">
        <span class="ff-pill-num">{{ enabledCount }}</span>
        <span class="ff-pill-label">Enabled</span>
      </div>
      <div class="ff-pill ff-pill--off">
        <span class="ff-pill-num">{{ disabledCount }}</span>
        <span class="ff-pill-label">Disabled</span>
      </div>
      <div class="ff-pill">
        <span class="ff-pill-num">{{ flags.length }}</span>
        <span class="ff-pill-label">Total</span>
      </div>
    </div>

    <!-- Flag list -->
    <div v-if="!loading && flags.length === 0" class="ff-empty">
      No feature flags found. Create one to get started.
    </div>

    <div class="ff-list">
      <div v-for="flag in sortedFlags" :key="flag.key" class="ff-card" :class="{ 'ff-card--on': flag.isEnabled }">

        <!-- Top row: key + toggle -->
        <div class="ff-card-top">
          <div class="ff-card-top-left">
            <code class="ff-key">{{ flagKey(flag.key) }}</code>
            <span class="ff-status-dot" :class="flag.isEnabled ? 'ff-status-dot--on' : 'ff-status-dot--off'" />
          </div>
          <el-switch
            :model-value="flag.isEnabled"
            :loading="!!toggling[flag.key]"
            @change="toggleFlag(flag)"
            active-color="#10b981"
            inactive-color="#374151"
          />
        </div>

        <!-- Label + remarks -->
        <p class="ff-label">{{ flag.label }}</p>
        <p v-if="flag.remarks" class="ff-remarks">{{ flag.remarks }}</p>

        <!-- Meta row + edit -->
        <div class="ff-meta">
          <div class="ff-meta-text">
            <span>Created {{ formatDt(flag.createdDt) }} by {{ flag.createdBy }}</span>
            <span v-if="flag.updatedDt">· Updated {{ formatDt(flag.updatedDt) }}<span v-if="flag.updatedBy"> by {{ flag.updatedBy }}</span></span>
          </div>
          <el-button text size="small" @click="openEdit(flag)">✏️ Edit</el-button>
        </div>
      </div>
    </div>

    <!-- ── Edit Drawer ─────────────────────────────────────────────── -->
    <el-drawer
      v-model="drawerVisible"
      :title="selectedFlag ? `Edit — ${selectedFlag.key}` : 'Edit Flag'"
      direction="rtl"
      size="380px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedFlag" class="drawer-body">
        <div class="drawer-key-preview">
          <code>{{ selectedFlag.key }}</code>
          <span class="ff-status-dot" :class="selectedFlag.isEnabled ? 'ff-status-dot--on' : 'ff-status-dot--off'" />
          <span class="drawer-status-text">{{ selectedFlag.isEnabled ? 'Enabled' : 'Disabled' }}</span>
        </div>

        <el-form label-position="top">
          <el-form-item label="Label">
            <el-input v-model="draftLabel" placeholder="Human-readable name" maxlength="100" show-word-limit />
          </el-form-item>
          <el-form-item label="Remarks / Description">
            <el-input v-model="draftRemarks" type="textarea" :rows="4" placeholder="Optional description of what this flag controls" maxlength="500" show-word-limit />
          </el-form-item>
        </el-form>

        <div class="drawer-toggle-section">
          <p class="drawer-section-label">Toggle</p>
          <div class="drawer-toggle-row">
            <span class="drawer-toggle-hint">Turn the flag {{ selectedFlag.isEnabled ? 'off' : 'on' }}</span>
            <el-switch
              :model-value="selectedFlag.isEnabled"
              :loading="!!toggling[selectedFlag.key]"
              @change="toggleFlag(selectedFlag)"
              active-color="#10b981"
              inactive-color="#374151"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="drawerVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" :disabled="!draftLabel.trim()" @click="saveEdit">Save</el-button>
      </template>
    </el-drawer>

    <!-- ── Create Dialog ──────────────────────────────────────────── -->
    <el-dialog v-model="createVisible" title="New Feature Flag" width="440px" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent="submitCreate">
        <el-form-item label="Key" required>
          <el-input
            v-model="createForm.key"
            placeholder="e.g. sleep_screenshot_parsing"
            maxlength="80"
          />
          <p class="create-hint">Lowercase, underscores only. Cannot be changed after creation.</p>
        </el-form-item>
        <el-form-item label="Label" required>
          <el-input v-model="createForm.label" placeholder="Human-readable name" maxlength="100" />
        </el-form-item>
        <el-form-item label="Remarks">
          <el-input v-model="createForm.remarks" type="textarea" :rows="3" placeholder="Optional description" maxlength="500" />
        </el-form-item>
        <p class="create-disabled-note">⚠️ New flags are created <strong>disabled</strong> by default. Toggle them on after creation.</p>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">Cancel</el-button>
        <el-button
          type="primary"
          :loading="creating"
          :disabled="!createForm.key.trim() || !createForm.label.trim()"
          @click="submitCreate"
        >Create</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<style scoped>
.ff-root {
  max-width: 720px;
}

/* Header */
.ff-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 0 16px;
  gap: 12px;
}

.ff-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ff-back {
  align-self: flex-start;
  padding: 0;
  margin-bottom: 6px;
  font-size: 0.8rem;
  opacity: 0.55;
}

.ff-title {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--color-heading);
  margin: 0;
}

.ff-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.5;
  margin: 4px 0 0;
}

/* Summary pills */
.ff-summary {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.ff-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  min-width: 80px;
}

.ff-pill--on  { border-color: #10b98144; background: #10b98108; }
.ff-pill--off { border-color: #6b728044; background: #6b728008; }

.ff-pill-num {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-heading);
  font-family: monospace;
  line-height: 1;
}

.ff-pill--on  .ff-pill-num { color: #10b981; }
.ff-pill--off .ff-pill-num { color: #9ca3af; }

.ff-pill-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.5;
}

/* Empty */
.ff-empty {
  text-align: center;
  padding: 48px 0;
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.4;
}

/* Flag list */
.ff-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ff-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 11px 14px;
  background: var(--color-background-soft);
  transition: border-color 0.15s;
}

.ff-card--on {
  border-color: #10b98133;
  background: color-mix(in srgb, var(--color-background-soft) 97%, #10b981);
}

.ff-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
}

.ff-card-top-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ff-key {
  font-size: 0.78rem;
  font-family: monospace;
  background: var(--color-background-mute);
  padding: 2px 8px;
  border-radius: 6px;
  color: var(--color-heading);
  word-break: break-all;
}

.ff-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ff-status-dot--on  { background: #10b981; box-shadow: 0 0 6px #10b98166; }
.ff-status-dot--off { background: #6b7280; }

.ff-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0 0 2px;
}

.ff-remarks {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.6;
  margin: 0 0 4px;
  line-height: 1.4;
}

.ff-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
}

.ff-meta-text {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.4;
  line-height: 1.5;
}

/* Drawer */
.drawer-body {
  padding: 0 4px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.drawer-key-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-background-mute);
  border-radius: 8px;
}

.drawer-key-preview code {
  font-size: 0.82rem;
  font-family: monospace;
  color: var(--color-heading);
  word-break: break-all;
  flex: 1;
}

.drawer-status-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.6;
  flex-shrink: 0;
}

.drawer-toggle-section {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px 14px;
}

.drawer-section-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text);
  opacity: 0.45;
  margin: 0 0 8px;
}

.drawer-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-toggle-hint {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
}

/* Create dialog */
.create-hint {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.45;
  margin: 4px 0 0;
}

.create-disabled-note {
  font-size: 0.78rem;
  color: #f59e0b;
  background: #f59e0b10;
  border: 1px solid #f59e0b33;
  border-radius: 8px;
  padding: 8px 12px;
  margin: 4px 0 0;
  line-height: 1.5;
}
</style>
