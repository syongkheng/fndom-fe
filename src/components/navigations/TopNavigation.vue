<script lang="ts" setup>
import { Star, User } from '@element-plus/icons-vue'
import { useNav } from '@/hooks/useNav'
import { Grid } from '@element-plus/icons-vue'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useAuthenticationStore } from '@/stores/authentication'
import { storeToRefs } from 'pinia'
import UtcClock from '../clocks/UtcClock.vue'
import { useBreakpointManager } from '@/hooks/useBreakpointManager'
import { Breakpoint } from '@/constants/Breakpoint'
import { computed } from 'vue'


const { redirectToDashboard, redirectToLanding, redirectToProfile } = useNav()

const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const { isAuthenticated } = storeToRefs(authStore) // Preserves reactivity
const { isScreensizeBelow } = useBreakpointManager()
const mobileDropdownMenu = computed(() => isScreensizeBelow(Breakpoint.M))

const handleMenuExpansion = () => {
  if (!mobileDropdownMenu.value) {
    layoutStore.sideNav.toggle()
  } else {
    layoutStore.mobileNavMenu.toggle()
    console.log("2 > ", layoutStore.mobileNavMenu.isVisible)
  }
}

</script>

<template>
  <header class="header">
    <nav class="nav-container">
      <div class="engagement-container">
        <div class="clickable toggle-menu-expansion" @click="handleMenuExpansion">
          <el-icon :size="25">
            <Grid />
          </el-icon>
        </div>
        <div class="logo-env clickable" @click="isAuthenticated ? redirectToDashboard() : redirectToLanding()">
          <div>
            <img src="../../../public/icon-dark.png" width="50px" />
          </div>
          <div class="clock-wrapper">

            <div>
              <RouterLink to="/">{{ 'Finderium' }}</RouterLink>
            </div>
            <div class="clock">
              <UtcClock />
            </div>
          </div>
        </div>
      </div>
      <ul class="nav-links">
        <span v-if="!isAuthenticated">
          <el-button @click="layoutStore.loginDialog.toggle" type="primary" :icon="Star">
            {{ 'Login' }}
          </el-button>
        </span>
        <span v-else>
          <el-button @click="redirectToProfile()" type="primary" :icon="User">
            {{ 'Profile' }}
          </el-button>
        </span>
      </ul>
    </nav>
  </header>
</template>

<style scoped>
.header {
  --header-bg: #f8f9fa;
  --border-color: #e9ecef;
  --text-color: #2c3e50;
  --active-color: #42b983;
  --success-color: var(--el-color-success);
  --white: var(--el-color-white);
  --icon-color: #aaaaaa;

  position: sticky;
  top: 0;
  z-index: 999;
  padding: 1em;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  height: 80px;
  flex: 1;
}

.clock-wrapper {
  display: flex;
  flex-direction: column;
}

.clock {
  font-size: 0.65rem;
  padding: 0.3rem 0.5rem;
  border-radius: 0.1rem;
  background-color: #fff;
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 auto;
  padding: 0 1em 0 0.5em;
}

/* Logo & Menu Toggle */
.logo-env {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  a {
    font: bold 1.5em sans-serif;
    color: var(--text-color);
    text-decoration: none;
  }
}

/* Navigation Links */
.nav-links {
  display: flex;
  gap: 2em;
  margin: 0;
  padding: 0;
  list-style: none;

  a {
    color: var(--text-color);
    font-weight: 500;
    text-decoration: none;
    transition: color 0.3s ease;

    &:hover,
    &.active {
      color: var(--active-color);
    }

    &.active {
      border-bottom: 2px solid var(--active-color);
    }
  }
}

/* Utility Classes */
.clickable {
  cursor: pointer;
}

.toggle-menu-expansion {
  display: flex;
  color: var(--icon-color);
}

/* Search & Engagement */
.engagement-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.engagement-search-container {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: 0 1rem 0 0.25rem;
  color: var(--white);
  background-color: var(--success-color);
  border-radius: 0 0.25rem 0.25rem 0;
}

/* Element Plus Overrides */
:deep(.el-input__wrapper) {
  padding-right: 0;
}

/* Responsive Behavior */
@media (max-width: 800px) {

  .engagement-container>*:not(.toggle-menu-expansion):not(.logo-env),
  .nav-links>*:not(:has(.el-button--success)) {
    display: none;
  }

  .el-button--success {
    display: inline-flex;
  }
}
</style>
