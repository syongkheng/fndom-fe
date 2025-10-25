<script lang="ts" setup>
import { ElDialog, ElDivider, ElIcon, ElMessage } from 'element-plus'
import { HomeFilled, Bell, Operation, MoonNight, Notification, User, Star } from '@element-plus/icons-vue'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useNav } from '@/hooks/useNav'
import { useAuthenticationStore } from '@/stores/authentication'
import { storeToRefs } from 'pinia'

const authStore = useAuthenticationStore()
const layoutStore = useLayoutStateStore()
const navigate = useNav()

const { isAuthenticated } = storeToRefs(authStore)

// ✅ a small wrapper to close after any click
const handleMenuClick = (action: () => void) => {
  action()
  layoutStore.mobileNavMenu.setFalse?.() // safely call if method exists
}

const handleLogout = () => {
  authStore.handleLogout()
  navigate.redirectToLanding()
  ElMessage.success('Logout Successfully')
}

const handleSetting = () => {
  ElMessage.info('Page Coming Soon')
}
</script>

<template>
  <el-dialog v-model="layoutStore.mobileNavMenu.isVisible" width="280px" align-center class="mobile-menu-dialog">
    <div class="menu-container">
      <span class="menu-item" @click="handleMenuClick(() => layoutStore.loginDialog.toggle())" v-if="!isAuthenticated">
        <el-icon>
          <Star />
        </el-icon>
        <span class="menu-label">Login</span>
      </span>
      <span class="menu-item" @click="handleMenuClick(() => navigate.redirectToLanding())">
        <el-icon>
          <HomeFilled />
        </el-icon>
        <span class="menu-label">Home</span>
      </span>

      <!-- <span class="menu-item" @click="handleMenuClick(() => navigate.redirectToSchedule())">
        <el-icon>
          <Bell />
        </el-icon>
        <span class="menu-label">Events</span>
      </span> -->

      <el-divider class="menu-divider" />

      <template v-if="isAuthenticated">
        <span class="menu-item" @click="handleMenuClick(navigate.redirectToDashboard)">
          <el-icon>
            <Notification />
          </el-icon>
          <span class="menu-label">{{ 'Dashboard' }}</span>
        </span>
        <span class="menu-item" @click="handleMenuClick(handleSetting)">
          <el-icon>
            <Operation />
          </el-icon>
          <span class="menu-label">Settings</span>
        </span>
        <span class="menu-item" @click="handleMenuClick(navigate.redirectToProfile)">
          <el-icon>
            <User />
          </el-icon>
          <span class="menu-label">Profile</span>
        </span>
        <span class="menu-item" @click="handleMenuClick(handleLogout)">
          <el-icon>
            <MoonNight />
          </el-icon>
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
  --menu-icon: #666;
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
  gap: 12px;
  padding: 12px 20px;
  color: var(--menu-text);
  font-size: 1rem;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
}

.menu-item:hover {
  background-color: var(--menu-hover);
}

.menu-item:active {
  background-color: var(--menu-active);
}

.menu-label {
  flex: 1;
  font-weight: 500;
}

.menu-divider {
  margin: 8px 0;
}
</style>
