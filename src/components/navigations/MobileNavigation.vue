<script lang="ts" setup>
import { computed } from 'vue'
import { ElDialog, ElDivider, ElMessage } from 'element-plus'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useNav } from '@/hooks/useNav'
import { useAuthenticationStore } from '@/stores/authentication'
import { useFeatureFlagStore } from '@/stores/featureFlags'
import { usePermission } from '@/composables/usePermission'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const authStore = useAuthenticationStore()
const layoutStore = useLayoutStateStore()
const flagStore = useFeatureFlagStore()
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
  ElMessage.success('Logout Successfully')
}

const publicModules = [
  { label: 'PPHS', path: '/pphs', featureKey: 'pphs' },
  { label: 'Flat Analysis', path: '/flat', featureKey: 'flat-analysis' },
  { label: 'Scenic Spots', path: '/scenic', featureKey: 'china-scenic' },
]

const personalModules = [
  { label: 'Travel', path: '/travel', featureKey: 'travel' },
  { label: 'Sleep', path: '/sleep', featureKey: 'sleep' },
  { label: 'Douyin', path: '/douyin', featureKey: 'douyin' },
  { label: 'Expense', path: '/expense', featureKey: 'expense' },
  { label: 'Telegram Storage', path: '/telegram', featureKey: 'telegram' },
]

const visiblePublic = computed(() => publicModules.filter(m => flagStore.isEnabled(m.featureKey)))
const visiblePersonal = computed(() => personalModules.filter(m => flagStore.isEnabled(m.featureKey)))
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
      <template v-if="flagStore.isEnabled('travel')">
        <el-divider class="menu-divider" />
        <span class="menu-item" @click="handleMenuClick(() => navigate.redirectTo('/travel'))">
          <span class="menu-label">{{ t('nav.travel') }}</span>
        </span>
      </template>

      <!-- Internal modules — SYSTEM_R5 only -->
      <template v-if="isInternal && visiblePublic.length">
        <el-divider class="menu-divider" />
        <span v-for="mod in visiblePublic" :key="mod.path" class="menu-item"
          @click="handleMenuClick(() => navigate.redirectTo(mod.path))">
          <span class="menu-label">{{ mod.label }}</span>
        </span>
      </template>

      <template v-if="isInternal && isAuthenticated && visiblePersonal.length">
        <el-divider class="menu-divider" />
        <span v-for="mod in visiblePersonal.filter(m => m.path !== '/travel')" :key="mod.path" class="menu-item"
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
