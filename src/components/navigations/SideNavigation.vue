<script lang="ts" setup>
import { Bell, HomeFilled, MoonNight, Notification, Operation } from '@element-plus/icons-vue'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useNav } from '@/hooks/useNav'
import { ElMessage } from 'element-plus';
import { useAuthenticationStore } from '@/stores/authentication';
import { storeToRefs } from 'pinia';
import { useBreakpointManager } from '@/hooks/useBreakpointManager';
import { Breakpoint } from '@/constants/Breakpoint';

const layoutStore = useLayoutStateStore()
const navigate = useNav();
const authStore = useAuthenticationStore()
const { isAuthenticated } = storeToRefs(authStore) // Preserves reactivity
const { isScreensizeBelow } = useBreakpointManager();

const handleLogout = () => {
  authStore.handleLogout()
  navigate.redirectToLanding()
  ElMessage.success('Logout Successfully')
}

const handleSetting = () => {
  ElMessage.info("Page Coming Soon")
}

</script>

<template>
  <el-menu class="el-menu-vertical-demo" :collapse="!layoutStore.sideNav.isExpanded"
    v-if="!isScreensizeBelow(Breakpoint.M)">
    <span @click="navigate.redirectToLanding()">
      <el-menu-item index="1">
        <el-icon>
          <HomeFilled />
        </el-icon>
        <template #title>{{ 'Home' }}</template>
      </el-menu-item>
    </span>
    <span @click="navigate.redirectToSchedule()">
      <el-menu-item index="2">
        <el-icon>
          <Bell />
        </el-icon>
        <template #title>{{ 'Events' }}</template>
      </el-menu-item>
    </span>
    <el-divider />
    <span class="authenticated menu" v-if="isAuthenticated">
      <span @click="navigate.redirectToDashboard()">
        <el-menu-item index="6">
          <el-icon>
            <Notification />
          </el-icon>
          <template #title>{{ 'Dashboard' }}</template>
        </el-menu-item>
      </span>
      <span @click="handleSetting">
        <el-menu-item index="4">
          <el-icon>
            <Operation />
          </el-icon>
          <template #title>{{ 'Settings' }}</template>
        </el-menu-item>
      </span>
      <span @click="handleLogout">
        <el-menu-item index="5">
          <el-icon>
            <MoonNight />
          </el-icon>
          <template #title>{{ 'Logout' }}</template>
        </el-menu-item>
      </span>
    </span>
  </el-menu>
</template>

<style scoped>
.el-menu-vertical-demo {
  height: calc(100vh - 80px);
}

.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 200px;
}

.el-menu-vertical-demo .el-divider--horizontal {
  margin: 0;
}
</style>
