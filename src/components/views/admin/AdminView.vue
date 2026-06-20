<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'

const router = useRouter()

const userCount = ref<number | null>(null)
const userWithRolesCount = ref<number | null>(null)
const imgAdminCount = ref<number | null>(null)
const loading = ref(true)

onMounted(async () => {
  const [usersRes, imgAdminsRes] = await Promise.allSettled([
    HttpClient.get(ApiRoute.ADMIN.LIST_USERS),
    HttpClient.get(ApiRoute.TG_IMG.ADMIN.LIST),
  ])
  if (usersRes.status === 'fulfilled' && usersRes.value?.data?.data) {
    const users = usersRes.value.data.data
    userCount.value = users.length
    userWithRolesCount.value = users.filter((u: { roles: string[] }) => u.roles.length > 0).length
  }
  if (imgAdminsRes.status === 'fulfilled' && imgAdminsRes.value?.data?.data) {
    imgAdminCount.value = imgAdminsRes.value.data.data.length
  }
  loading.value = false
})
</script>

<template>
  <div class="admin-root">

    <div class="admin-header">
      <h1 class="admin-title">Admin</h1>
      <p class="admin-subtitle">Manage users, roles, and system settings.</p>
    </div>

    <div class="admin-cards" v-loading="loading">

      <div class="admin-card" @click="router.push('/admin/users')">
        <div class="admin-card-icon">👤</div>
        <div class="admin-card-body">
          <div class="admin-card-title">User Management</div>
          <div class="admin-card-desc">Grant and revoke module roles across all registered users.</div>
          <div class="admin-card-stat" v-if="userCount !== null">
            <span class="stat-num">{{ userCount }}</span>
            <span class="stat-lbl">users · {{ userWithRolesCount }} with roles</span>
          </div>
        </div>
        <div class="admin-card-arrow">→</div>
      </div>

      <div class="admin-card" @click="router.push('/admin/tg-image')">
        <div class="admin-card-icon">🖼️</div>
        <div class="admin-card-body">
          <div class="admin-card-title">Image Hosting Admins</div>
          <div class="admin-card-desc">Manage who can access CDN bot commands for hosted image stats.</div>
          <div class="admin-card-stat" v-if="imgAdminCount !== null">
            <span class="stat-num">{{ imgAdminCount }}</span>
            <span class="stat-lbl">admin{{ imgAdminCount !== 1 ? 's' : '' }}</span>
          </div>
        </div>
        <div class="admin-card-arrow">→</div>
      </div>

      <div class="admin-card" @click="router.push('/admin/llm-pricing')">
        <div class="admin-card-icon">💰</div>
        <div class="admin-card-body">
          <div class="admin-card-title">Marketplace Pricing</div>
          <div class="admin-card-desc">Configure model availability, billing rates, and display prices for the AI marketplace.</div>
        </div>
        <div class="admin-card-arrow">→</div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.admin-root {
  max-width: 720px;
  width: 100%;
  justify-self: center;
  padding-bottom: 48px;
}

.admin-header {
  padding: 24px 0 28px;
}

.admin-title {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--color-heading);
  margin: 0 0 4px;
}

.admin-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.55;
  margin: 0;
}

.admin-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.admin-card {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px 20px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-background-soft);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.admin-card:hover {
  border-color: var(--el-color-primary);
  background: var(--color-background-mute);
}

.admin-card-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.admin-card-body {
  flex: 1;
  min-width: 0;
}

.admin-card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 4px;
}

.admin-card-desc {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.6;
  line-height: 1.4;
}

.admin-card-stat {
  margin-top: 10px;
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.stat-num {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--el-color-primary);
  font-family: monospace;
  line-height: 1;
}

.stat-lbl {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.5;
}

.admin-card-arrow {
  font-size: 1.1rem;
  color: var(--color-text);
  opacity: 0.3;
  flex-shrink: 0;
}
</style>
