<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { GRANTABLE_ROLES, MODULE_COLORS, type RoleDefinition } from '@/constants/Roles'

const router = useRouter()

interface UserRecord {
  id: number
  username: string
  system: string
  roles: string[]
  state: string
  lastLoggedInDt: number
  createdDt: number
}

const users = ref<UserRecord[]>([])
const loading = ref(true)
const saving = ref(false)

// Drawer
const drawerVisible = ref(false)
const selectedUser = ref<UserRecord | null>(null)
const draftRoles = ref<string[]>([])

const groupedRoles = computed(() => {
  const map: Record<string, RoleDefinition[]> = {}
  for (const role of GRANTABLE_ROLES) {
    if (!map[role.module]) map[role.module] = []
    map[role.module].push(role)
  }
  return map
})

const formatDate = (ts: number) => {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatLastSeen = (ts: number) => {
  if (!ts) return 'Never'
  const diff = Date.now() - ts
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return formatDate(ts)
}

const roleTagType = (role: string) => {
  const module = role.split('_')[0]
  return MODULE_COLORS[module] ?? 'info'
}

const fetchUsers = async () => {
  loading.value = true
  const res = await HttpClient.get(ApiRoute.ADMIN.LIST_USERS).catch(() => null)
  if (res?.data?.data) {
    users.value = res.data.data
  } else {
    ElMessage.error('Failed to load users.')
  }
  loading.value = false
}

const openRoleEditor = (user: UserRecord) => {
  selectedUser.value = user
  draftRoles.value = [...user.roles]
  drawerVisible.value = true
}

const toggleRole = (role: string) => {
  const idx = draftRoles.value.indexOf(role)
  if (idx === -1) {
    draftRoles.value.push(role)
  } else {
    draftRoles.value.splice(idx, 1)
  }
}

const saveRoles = async () => {
  if (!selectedUser.value) return
  saving.value = true
  const res = await HttpClient.post(
    ApiRoute.ADMIN.UPDATE_USER_ROLES(selectedUser.value.id),
    { roles: draftRoles.value }
  ).catch(() => null)
  saving.value = false
  if (res?.data?.data?.updated) {
    selectedUser.value.roles = [...draftRoles.value]
    const idx = users.value.findIndex(u => u.id === selectedUser.value!.id)
    if (idx !== -1) users.value[idx].roles = [...draftRoles.value]
    ElMessage.success('Roles updated.')
    drawerVisible.value = false
  } else {
    ElMessage.error('Failed to update roles.')
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div class="admin-root">

    <!-- Header -->
    <div class="admin-header">
      <div>
        <el-button text size="small" @click="router.push('/admin')" class="admin-back">← Admin</el-button>
        <h1 class="admin-title">User Management</h1>
        <p class="admin-subtitle">Grant and revoke module roles across all registered users.</p>
      </div>
      <el-button size="small" @click="fetchUsers" :loading="loading">Refresh</el-button>
    </div>

    <!-- Stats -->
    <div class="admin-stats">
      <div class="stat-item">
        <span class="stat-val">{{ users.length }}</span>
        <span class="stat-label">Total Users</span>
      </div>
      <div class="stat-divider" />
      <div class="stat-item">
        <span class="stat-val">{{ users.filter(u => u.roles.length > 0).length }}</span>
        <span class="stat-label">With Roles</span>
      </div>
      <div class="stat-divider" />
      <div class="stat-item">
        <span class="stat-val">{{ users.filter(u => u.roles.length === 0).length }}</span>
        <span class="stat-label">Members Only</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="admin-loading">
      <el-skeleton :rows="6" animated />
    </div>

    <!-- User list -->
    <div v-else class="user-list">
      <div
        v-for="user in users"
        :key="user.id"
        class="user-row"
        @click="openRoleEditor(user)"
      >
        <div class="user-avatar">
          {{ user.username.charAt(0).toUpperCase() }}
        </div>
        <div class="user-main">
          <div class="user-name">{{ user.username }}</div>
          <div class="user-meta">Joined {{ formatDate(user.createdDt) }} · Last seen {{ formatLastSeen(user.lastLoggedInDt) }}</div>
        </div>
        <div class="user-roles">
          <el-tag
            v-for="role in user.roles"
            :key="role"
            :type="roleTagType(role)"
            size="small"
            class="role-chip"
          >{{ role }}</el-tag>
          <span v-if="!user.roles.length" class="no-roles">Member</span>
        </div>
        <div class="user-action">
          <el-button size="small" link>Edit roles →</el-button>
        </div>
      </div>
    </div>

  </div>

  <!-- Role editor drawer -->
  <el-drawer
    v-model="drawerVisible"
    :title="`Edit roles — ${selectedUser?.username}`"
    direction="rtl"
    size="400px"
  >
    <div class="drawer-body" v-if="selectedUser">

      <div class="drawer-user-info">
        <div class="drawer-avatar">{{ selectedUser.username.charAt(0).toUpperCase() }}</div>
        <div>
          <div class="drawer-username">{{ selectedUser.username }}</div>
          <div class="drawer-system">system: {{ selectedUser.system }}</div>
        </div>
      </div>

      <div class="drawer-current">
        <div class="drawer-section-label">Current roles</div>
        <div class="roles-preview">
          <el-tag
            v-for="role in draftRoles"
            :key="role"
            :type="roleTagType(role)"
            size="small"
            closable
            @close="toggleRole(role)"
          >{{ role }}</el-tag>
          <span v-if="!draftRoles.length" class="no-roles-sm">No roles assigned — user is a Member</span>
        </div>
      </div>

      <div v-for="(roles, module) in groupedRoles" :key="module" class="role-module-group">
        <div class="module-heading">
          <el-tag :type="MODULE_COLORS[module]" size="small" effect="plain">{{ module }}</el-tag>
        </div>
        <div class="role-options">
          <div
            v-for="role in roles"
            :key="role.value"
            class="role-option"
            :class="{ selected: draftRoles.includes(role.value), danger: role.danger }"
            @click="toggleRole(role.value)"
          >
            <div class="role-option-top">
              <span class="role-option-label">{{ role.label }}</span>
              <el-icon v-if="draftRoles.includes(role.value)" class="role-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </el-icon>
            </div>
            <div class="role-option-desc">{{ role.description }}</div>
          </div>
        </div>
      </div>

    </div>

    <template #footer>
      <div class="drawer-footer">
        <el-button @click="drawerVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="saveRoles">Save Roles</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.admin-root {
  max-width: 900px;
  width: 100%;
  justify-self: center;
  padding-bottom: 48px;
}

/* Header */
.admin-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 0 16px;
  gap: 12px;
}

.admin-back {
  align-self: flex-start;
  padding: 0;
  margin-bottom: 6px;
  font-size: 0.8rem;
  opacity: 0.55;
}

.admin-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 4px;
}

.admin-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
  margin: 0;
}

/* Stats */
.admin-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-val {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-heading);
  line-height: 1;
}

.stat-label {
  font-size: 0.68rem;
  color: var(--color-text);
  opacity: 0.5;
  white-space: nowrap;
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
}

/* Loading */
.admin-loading {
  padding: 16px 0;
}

/* User list */
.user-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.user-row:hover {
  border-color: var(--el-color-primary);
  background: var(--color-background-mute);
}

.user-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--el-color-primary) 15%, transparent);
  color: var(--el-color-primary);
  font-size: 0.95rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-main {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
}

.user-meta {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.45;
  margin-top: 2px;
}

.user-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 300px;
  justify-content: flex-end;
}

.role-chip {
  font-size: 0.68rem;
  font-weight: 600;
}

.no-roles {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.35;
  font-style: italic;
}

.user-action {
  flex-shrink: 0;
}

/* Drawer */
.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 16px;
}

.drawer-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: var(--color-background-mute);
  border-radius: 10px;
}

.drawer-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--el-color-primary) 15%, transparent);
  color: var(--el-color-primary);
  font-size: 1.1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.drawer-username {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
}

.drawer-system {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.45;
  margin-top: 2px;
}

.drawer-current {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.drawer-section-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.4;
}

.roles-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 28px;
}

.no-roles-sm {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.4;
  font-style: italic;
  align-self: center;
}

/* Module groups */
.role-module-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.module-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.role-option {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  background: var(--color-background-soft);
}

.role-option:hover {
  border-color: var(--el-color-primary);
  background: var(--color-background-mute);
}

.role-option.selected {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
}

.role-option.danger.selected {
  border-color: var(--el-color-danger);
  background: color-mix(in srgb, var(--el-color-danger) 8%, transparent);
}

.role-option-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.role-option-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-heading);
}

.role-check {
  color: var(--el-color-primary);
  font-size: 1rem;
}

.role-option.danger .role-check {
  color: var(--el-color-danger);
}

.role-option-desc {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.55;
  line-height: 1.4;
}

/* Drawer footer */
.drawer-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Mobile */
@media (max-width: 600px) {
  .user-roles {
    display: none;
  }

  .user-action {
    display: none;
  }
}
</style>
