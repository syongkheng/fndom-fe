<script lang="ts" setup>
import { useToast } from '@/composables/useToast'
import { computed } from 'vue'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useNav } from '@/hooks/useNav'
import { useAuthenticationStore } from '@/stores/authentication'
import { usePermission } from '@/composables/usePermission'
import { useAnalyticsStore } from '@/stores/analytics'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const authStore = useAuthenticationStore()
const layoutStore = useLayoutStateStore()
const navigate = useNav()
const { hasModuleAccess } = usePermission()
const { t } = useI18n()
const toast = useToast()

const { isAuthenticated } = storeToRefs(authStore)
const isInternal = computed(() => hasModuleAccess('SYSTEM', 5))
const { systems: analyticsSystems } = storeToRefs(useAnalyticsStore())

const handleMenuClick = (action: () => void) => {
  action()
  layoutStore.mobileNavMenu.setFalse?.()
}

const handleLogout = () => {
  authStore.handleLogout()
  navigate.redirectToLanding()
  toast.success(t('toast.logoutSuccess'))
}

// Mirrors TopNavigation's primary links, numbered like a drawing index.
const items = computed(() => [
  { key: 'home', label: t('nav.workbench'), path: '/', show: true },
  { key: 'house', label: t('nav.house'), path: '/house', show: true },
  { key: 'budget', label: t('nav.budget'), path: '/budget', show: true },
  { key: 'todo', label: t('nav.todo'), path: '/todo', show: true },
  { key: 'trips', label: t('nav.trips'), path: '/travel/trips', show: true },
  { key: 'applePay', label: t('nav.applePay'), path: '/apple-pay', show: isAuthenticated.value },
  { key: 'camera', label: t('nav.camera'), path: '/camera', show: isAuthenticated.value },
  { key: 'analytics', label: t('nav.analytics'), path: '/analytics', show: isAuthenticated.value && analyticsSystems.value.length > 0 },
  { key: 'admin', label: t('nav.admin'), path: '/admin', show: isInternal.value },
].filter((i) => i.show))
</script>

<template>
  <el-dialog v-model="layoutStore.mobileNavMenu.isVisible" width="280px" align-center class="mobile-menu-dialog">
    <div class="menu-container">
      <span class="menu-item" @click="handleMenuClick(() => layoutStore.loginDialog.toggle())" v-if="!isAuthenticated">
        <span class="menu-label">{{ t('nav.login') }}</span>
      </span>

      <span v-for="(item, i) in items" :key="item.key" class="menu-item"
        @click="handleMenuClick(() => navigate.redirectTo(item.path))">
        <span class="menu-index">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="menu-label">{{ item.label }}</span>
      </span>

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
  gap: 12px;
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
  color: var(--color-danger);
  opacity: 0.85;
}

.menu-index {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}

.menu-label {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.menu-divider {
  margin: 6px 0;
}
</style>
