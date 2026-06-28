<script lang="ts" setup>
import { computed } from 'vue'
import { ElDialog, ElDivider, ElMessage } from 'element-plus'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useNav } from '@/hooks/useNav'
import { useAuthenticationStore } from '@/stores/authentication'
import { usePermission } from '@/composables/usePermission'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const authStore = useAuthenticationStore()
const layoutStore = useLayoutStateStore()
const navigate = useNav()
const { hasModuleAccess } = usePermission()
const { t } = useI18n()

const { isAuthenticated } = storeToRefs(authStore)
const isInternal = computed(() => hasModuleAccess('SYSTEM', 5))

const handleMenuClick = (action: () => void) => {
  action()
  layoutStore.mobileNavMenu.setFalse?.()
}

const handleLogout = () => {
  authStore.handleLogout()
  navigate.redirectToLanding()
  ElMessage.success(t('toast.logoutSuccess'))
}

const publicModules = computed(() => [
  { label: t('workbench.tiles.pphs.label'),   path: '/pphs' },
  { label: t('workbench.tiles.flat.label'),   path: '/flat' },
  { label: t('workbench.tiles.scenic.label'), path: '/scenic' },
])

const personalModules = computed(() => [
  { label: t('workbench.tiles.travel.label'),      path: '/travel' },
  { label: t('workbench.tiles.douyin.label'),      path: '/douyin' },
  { label: t('workbench.tiles.telegram.label'),    path: '/telegram' },
  { label: t('workbench.tiles.marketplace.label'), path: '/llm' },
])
</script>

<template>
  <el-dialog v-model="layoutStore.mobileNavMenu.isVisible" width="280px" align-center class="mobile-menu-dialog">
    <div class="menu-container">

      <span class="menu-item" @click="handleMenuClick(() => layoutStore.loginDialog.toggle())" v-if="!isAuthenticated">
        <span class="menu-label">{{ t('nav.login') }}</span>
      </span>

      <span class="menu-item" @click="handleMenuClick(() => navigate.redirectTo(isInternal ? '/workbench' : '/'))">
        <span class="menu-label">{{ t('nav.home') }}</span>
      </span>

      <!-- Travel — visible to everyone -->
      <template>
        <el-divider class="menu-divider" />
        <span class="menu-item" @click="handleMenuClick(() => navigate.redirectTo('/travel'))">
          <span class="menu-label">{{ t('nav.travel') }}</span>
        </span>
      </template>

      <!-- Baby Tracker — any logged-in user -->
      <template v-if="isAuthenticated">
        <el-divider class="menu-divider" />
        <span class="menu-item" @click="handleMenuClick(() => navigate.redirectTo('/baby'))">
          <span class="menu-label">{{ t('nav.babyTracker') }}</span>
        </span>
      </template>

      <!-- Internal modules — SYSTEM_R5 only -->
      <template v-if="isInternal">
        <el-divider class="menu-divider" />
        <span v-for="mod in publicModules" :key="mod.path" class="menu-item"
          @click="handleMenuClick(() => navigate.redirectTo(mod.path))">
          <span class="menu-label">{{ mod.label }}</span>
        </span>
      </template>

      <template v-if="isInternal && isAuthenticated">
        <el-divider class="menu-divider" />
        <span v-for="mod in personalModules.filter(m => m.path !== '/travel')" :key="mod.path" class="menu-item"
          @click="handleMenuClick(() => navigate.redirectTo(mod.path))">
          <span class="menu-label">{{ mod.label }}</span>
        </span>
      </template>

      <template v-if="isAuthenticated">
        <el-divider class="menu-divider" />
        <span class="menu-item" @click="handleMenuClick(navigate.redirectToProfile)">
          <span class="menu-label">{{ t('nav.profile') }}</span>
        </span>
        <span class="menu-item menu-item--danger" @click="handleMenuClick(handleLogout)">
          <span class="menu-label">{{ t('nav.logout') }}</span>
        </span>
      </template>

    </div>
  </el-dialog>
</template>

<style scoped>
.mobile-menu-dialog {
  --menu-bg: var(--color-background-soft);
  --menu-hover: var(--color-background-mute);
  --menu-active: var(--el-color-primary-light-9);
  --menu-text: var(--color-heading);
  --menu-radius: 8px;

  .el-dialog__body {
    padding: 0;
  }
}

.menu-container {
  display: flex;
  flex-direction: column;
  padding: 10px 0;
  background-color: var(--menu-bg);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 11px 20px;
  color: var(--menu-text);
  font-size: 0.95rem;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.menu-item:hover {
  background-color: var(--menu-hover);
}

.menu-item:active {
  background-color: var(--menu-active);
}

.menu-item--danger {
  color: var(--el-color-danger);
  opacity: 0.8;
}

.menu-label {
  flex: 1;
  font-weight: 500;
}

.menu-divider {
  margin: 6px 0;
}
</style>
