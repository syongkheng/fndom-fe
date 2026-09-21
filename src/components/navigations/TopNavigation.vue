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
import { useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useLocale } from '@/composables/useLocale'
import StableWidth from '@/components/common/StableWidth.vue'

const { redirectTo, redirectToProfile } = useNav()
const themeStore = useThemeStore()

const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const { isAuthenticated } = storeToRefs(authStore) // Preserves reactivity
const { isScreensizeBelow } = useBreakpointManager()
const mobileDropdownMenu = computed(() => isScreensizeBelow(Breakpoint.M))

const { locale, setLocale } = useLocale()

defineProps<{ hidden?: boolean }>()

// position:sticky is silently inert here: #app/body set overflow-x:hidden
// without overflow-y, and per spec that forces overflow-y to compute as auto
// on both — so .header's nearest "scroll container" ancestor for sticky
// purposes becomes #app (which never itself scrolls, being content-sized),
// not the real scrolling element (<html>). Sticky then just behaves like
// static positioning once content exceeds one screen. Only the home hero
// currently has taller-than-viewport content, so only there do we need a
// real viewport-fixed header — everywhere else this bug is latent/harmless
// (content has always fit in one screen) and left alone rather than fixing
// site-wide positioning as a side effect of this feature.
const route = useRoute()
const isHomeRoute = computed(() => route.name === 'home')

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
  <header class="header" :class="{ 'header--hidden': hidden, 'header--overlay': isHomeRoute }">
    <nav class="nav-container">
      <div class="engagement-container">
        <div class="clickable toggle-menu-expansion" @click="handleMenuExpansion">
          <!-- <el-icon :size="25">
            <Grid />
          </el-icon>
          <span>Menu</span> -->
        </div>
        <div class="logo-env clickable" @click="redirectTo('/')">
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
            <StableWidth path="nav.login" />
          </el-button>
        </span>
        <span v-else>
          <el-button @click="redirectToProfile()" type="primary" :icon="User" size="small">
            <StableWidth path="nav.profile" />
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
  z-index: 9999;
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
  transition: transform 0.28s ease;
}

.header--hidden {
  transform: translateY(-100%);
}

.header--overlay {
  /* position:sticky is inert once content is taller than one viewport (see
     the comment in the script block) — use a real viewport-fixed overlay
     here so hide/show-on-scroll actually tracks the browser window. */
  position: fixed;
  top: 0;
  left: 0;
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
