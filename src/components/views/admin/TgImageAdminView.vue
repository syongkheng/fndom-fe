<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { useRouter } from 'vue-router'

const router = useRouter()
const { t } = useI18n()

interface AdminRecord {
  id: number
  telegram_user_id: number
  added_dt: number
}

const admins = ref<AdminRecord[]>([])
const loading = ref(true)
const removing = ref<Record<number, boolean>>({})

const addVisible = ref(false)
const addUserId = ref('')
const adding = ref(false)

const formatDt = (ts: number) =>
  new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const fetchAdmins = async () => {
  loading.value = true
  const res = await HttpClient.get(ApiRoute.TG_IMG.ADMIN.LIST).catch(() => null)
  admins.value = res?.data?.data ?? []
  loading.value = false
}

onMounted(fetchAdmins)

const openAdd = () => {
  addUserId.value = ''
  addVisible.value = true
}

const submitAdd = async () => {
  const userId = Number(addUserId.value.trim())
  if (!userId || isNaN(userId)) return
  adding.value = true
  const res = await HttpClient.post(ApiRoute.TG_IMG.ADMIN.ADD, { telegramUserId: userId }).catch(() => null)
  adding.value = false
  if (res?.data?.data?.added) {
    ElMessage.success(t('toast.adminTgUserAdded', { userId }))
    addVisible.value = false
    await fetchAdmins()
  } else {
    ElMessage.error(t('toast.adminTgAddFailed'))
  }
}

const removeAdmin = async (record: AdminRecord) => {
  removing.value[record.id] = true
  const res = await HttpClient.post(ApiRoute.TG_IMG.ADMIN.REMOVE, { telegramUserId: record.telegram_user_id }).catch(() => null)
  removing.value[record.id] = false
  if (res?.data?.data?.removed) {
    admins.value = admins.value.filter(a => a.id !== record.id)
    ElMessage.success(t('toast.adminTgRemoved'))
  } else {
    ElMessage.error(t('toast.adminTgRemoveFailed'))
  }
}
</script>

<template>
  <div class="tgia-root page-container" v-loading="loading">

    <!-- Header -->
    <div class="tgia-header">
      <div class="tgia-header-left">
        <el-button text size="small" @click="router.push('/admin')" class="tgia-back">← Admin</el-button>
        <h1 class="tgia-title">Image Hosting Admins</h1>
        <p class="tgia-subtitle">{{ admins.length }} admin{{ admins.length !== 1 ? 's' : '' }} — these users can access the CDN bot commands</p>
      </div>
      <el-button type="primary" size="small" @click="openAdd">+ Add Admin</el-button>
    </div>

    <!-- Empty -->
    <div v-if="!loading && admins.length === 0" class="tgia-empty">
      No admins yet. Add a Telegram user ID to grant bot access.
    </div>

    <!-- List -->
    <div class="tgia-list">
      <div v-for="record in admins" :key="record.id" class="tgia-card">
        <div class="tgia-card-left">
          <div class="tgia-avatar">{{ String(record.telegram_user_id).charAt(0) }}</div>
          <div class="tgia-info">
            <code class="tgia-uid">{{ record.telegram_user_id }}</code>
            <span class="tgia-date">Added {{ formatDt(record.added_dt) }}</span>
          </div>
        </div>
        <el-button
          text
          type="danger"
          size="small"
          :loading="removing[record.id]"
          @click="removeAdmin(record)"
        >Remove</el-button>
      </div>
    </div>

    <!-- Add dialog -->
    <el-dialog v-model="addVisible" title="Add Admin" width="400px" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent="submitAdd">
        <el-form-item label="Telegram User ID" required>
          <el-input
            v-model="addUserId"
            placeholder="e.g. 123456789"
            type="number"
          />
          <p class="tgia-hint">Numeric Telegram user ID. The user must interact with the CDN bot after being added.</p>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">Cancel</el-button>
        <el-button
          type="primary"
          :loading="adding"
          :disabled="!addUserId.trim() || isNaN(Number(addUserId))"
          @click="submitAdd"
        >Add</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<style scoped>
.tgia-root {
  max-width: 720px;
}

.tgia-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 0 20px;
  gap: 12px;
}

.tgia-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tgia-back {
  align-self: flex-start;
  padding: 0;
  margin-bottom: 6px;
  font-size: 0.8rem;
  opacity: 0.55;
}

.tgia-title {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--color-heading);
  margin: 0;
}

.tgia-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.5;
  margin: 4px 0 0;
}

.tgia-empty {
  text-align: center;
  padding: 48px 0;
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.4;
}

.tgia-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tgia-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background-soft);
  transition: border-color 0.15s;
}

.tgia-card:hover {
  border-color: var(--el-color-primary-light-5);
}

.tgia-card-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tgia-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  font-size: 0.9rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  text-transform: uppercase;
}

.tgia-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tgia-uid {
  font-size: 0.88rem;
  font-family: monospace;
  color: var(--color-heading);
  font-weight: 600;
}

.tgia-date {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.45;
}

.tgia-hint {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.45;
  margin: 4px 0 0;
  line-height: 1.4;
}
</style>
