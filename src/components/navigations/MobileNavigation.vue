<script lang="ts" setup>
import { computed } from 'vue'
import { ElDialog, ElDivider, ElMessage } from 'element-plus'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useNav } from '@/hooks/useNav'
import { useAuthenticationStore } from '@/stores/authentication'
import { useFeatureFlagStore } from '@/stores/featureFlags'
import { storeToRefs } from 'pinia'

const authStore = useAuthenticationStore()
const layoutStore = useLayoutStateStore()
const flagStore = useFeatureFlagStore()
const navigate = useNav()

const { isAuthenticated } = storeToRefs(authStore)

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
  { label: 'Kingshot',      path: '/ks',    featureKey: 'kingshot' },
  { label: 'PPHS',          path: '/pphs',  featureKey: 'pphs' },
  { label: 'Flat Analysis', path: '/flat',  featureKey: 'flat-analysis' },
]

const personalModules = [
  { label: 'Travel',    path: '/travel',  featureKey: 'travel' },
  { label: 'Sleep',     path: '/sleep',   featureKey: 'sleep' },
  { label: 'Meal Prep', path: '/meal',    featureKey: 'meal' },
  { label: 'Douyin',    path: '/douyin',  featureKey: 'douyin' },
  { label: 'Wedding',   path: '/wedding', featureKey: 'wedding' },
  { label: 'Expense',   path: '/expense', featureKey: 'expense' },
]

const visiblePublic   = computed(() => publicModules.filter(m => flagStore.isEnabled(m.featureKey)))
const visiblePersonal = computed(() => personalModules.filter(m => flagStore.isEnabled(m.featureKey)))
</script>

<template>
  <el-dialog v-model="layoutStore.mobileNavMenu.isVisible" width="280px" align-center class="mobile-menu-dialog">
    <div class="menu-container">

      <span class="menu-item" @click="handleMenuClick(() => layoutStore.loginDialog.toggle())" v-if="!isAuthenticated">
        <span class="menu-label">Login</span>
      </span>

      <span class="menu-item" @click="handleMenuClick(() => navigate.redirectToLanding())">
        <span class="menu-label">Home</span>
      </span>

      <template v-if="visiblePublic.length">
        <el-divider class="menu-divider" />
        <span
          v-for="mod in visiblePublic"
          :key="mod.path"
          class="menu-item"
          @click="handleMenuClick(() => navigate.redirectTo(mod.path))"
        >
          <span class="menu-label">{{ mod.label }}</span>
        </span>
      </template>

      <template v-if="isAuthenticated && visiblePersonal.length">
        <el-divider class="menu-divider" />
        <span
          v-for="mod in visiblePersonal"
          :key="mod.path"
          class="menu-item"
          @click="handleMenuClick(() => navigate.redirectTo(mod.path))"
        >
          <span class="menu-label">{{ mod.label }}</span>
        </span>
      </template>

      <template v-if="isAuthenticated">
        <el-divider class="menu-divider" />
        <span class="menu-item" @click="handleMenuClick(navigate.redirectToProfile)">
          <span class="menu-label">Profile</span>
        </span>
        <span class="menu-item menu-item--danger" @click="handleMenuClick(handleLogout)">
          <span class="menu-label">Logout</span>
        </span>
      </template>

    </div>
  </el-dialog>
</template>

<style scoped>
.mobile-menu-dialog {
  --menu-bg: #fff;
  --menu-hover: #f5f5f5;
  --menu-active: var(--el-color-primary-light-9);
  --menu-text: #333;
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
