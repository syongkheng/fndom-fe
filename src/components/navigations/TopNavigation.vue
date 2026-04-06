<script lang="ts" setup>
import { Star, User } from '@element-plus/icons-vue'
import { useNav } from '@/hooks/useNav'
import { Grid } from '@element-plus/icons-vue'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useAuthenticationStore } from '@/stores/authentication'
import { storeToRefs } from 'pinia'
import { useBreakpointManager } from '@/hooks/useBreakpointManager'
import { Breakpoint } from '@/constants/Breakpoint'
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useLocale } from '@/composables/useLocale'

const { redirectToDashboard, redirectToLanding, redirectToProfile } = useNav()
const themeStore = useThemeStore()

const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const { isAuthenticated } = storeToRefs(authStore) // Preserves reactivity
const { isScreensizeBelow } = useBreakpointManager()
const mobileDropdownMenu = computed(() => isScreensizeBelow(Breakpoint.M))

const { locale, setLocale } = useLocale()

const isAdminViewEnabled = computed({
  get() {
    return !authStore.turnOffAdminFeatures
  },
  set(value: boolean) {
    authStore.turnOffAdminFeatures = !value
  }
})

const handleMenuExpansion = () => {
  if (!mobileDropdownMenu.value) {
    layoutStore.sideNav.toggle()
  } else {
    layoutStore.mobileNavMenu.toggle()
  }
}



</script>

<template>
  <header class="header">
    <nav class="nav-container">
      <div class="engagement-container">
        <div class="clickable toggle-menu-expansion" @click="handleMenuExpansion">
          <!-- <el-icon :size="25">
            <Grid />
          </el-icon>
          <span>Menu</span> -->
        </div>
        <div class="logo-env clickable" @click="isAuthenticated ? redirectToDashboard() : redirectToLanding()">
          <div>
            <img src="../../../public/awense-logo.png" width="50px" />
          </div>
          <div class="clock-wrapper">

            <!-- <div>
              <RouterLink to="/">{{ 'Awense' }}</RouterLink>
            </div> -->
            <!-- <div class="clock">
              <UtcClock />
            </div> -->
          </div>
        </div>
      </div>
      <div class="nav-links">
        <div class="lang-toggle">
          <button type="button" :class="{ active: locale === 'en' }" @click="setLocale('en')">EN</button>
          <button type="button" :class="{ active: locale === 'zh' }" @click="setLocale('zh')">中</button>
        </div>
        <el-button circle size="small" class="theme-toggle" @click="themeStore.toggle()">
          <span>{{ themeStore.isDark ? '☀️' : '🌙' }}</span>
        </el-button>
        <span v-if="!isAuthenticated">
          <el-button @click="layoutStore.loginDialog.toggle()" type="primary" :icon="Star" size="small">
            Login
          </el-button>
        </span>
        <span v-else>
          <el-button @click="redirectToProfile()" type="primary" :icon="User" size="small">
            Profile
          </el-button>
        </span>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 99;
  padding: 1em;
  background-color: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  height: 80px;
  display: flex;
  flex-direction: row;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  width: 100vw;
}

.clock-wrapper {
  display: flex;
  flex-direction: column;
}

.clock {
  font-size: 0.65rem;
  padding: 0.3rem 0.5rem;
  border-radius: 0.1rem;
  background-color: var(--color-background);
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 auto;
  flex: 1;
  max-width: 1200px;
}

/* Logo & Menu Toggle */
.logo-env {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  a {
    font: bold 1.5em sans-serif;
    color: var(--color-heading);
    text-decoration: none;
  }
}

/* Navigation Links */
.nav-links {
  gap: 2em;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: row;
  align-items: center;

  a {
    color: var(--color-heading);
    font-weight: 500;
    text-decoration: none;
    transition: color 0.3s ease;

    &:hover,
    &.active {
      color: var(--el-color-primary);
    }

    &.active {
      border-bottom: 2px solid var(--el-color-primary);
    }
  }
}

/* Utility Classes */
.clickable {
  cursor: pointer;
}

.toggle-menu-expansion {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--color-text);
  opacity: 0.5;
}

.theme-toggle {
  font-size: 0.85rem;
}

.lang-toggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

.lang-toggle button {
  padding: 4px 9px;
  font-size: 0.72rem;
  font-weight: 600;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text);
  opacity: 0.5;
  line-height: 1;
}

.lang-toggle button.active {
  background: var(--el-color-primary);
  color: #fff;
  opacity: 1;
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

  /* .engagement-container>*:not(.toggle-menu-expansion):not(.logo-env),
  .nav-links>*:not(:has(.el-button--success)) {
    display: none;
  } */

  .el-button--success {
    display: inline-flex;
  }
}
</style>
