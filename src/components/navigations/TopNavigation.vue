<script lang="ts" setup>
import { Star, User } from '@element-plus/icons-vue'
import { useNav } from '@/hooks/useNav'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useAuthenticationStore } from '@/stores/authentication'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '@/stores/theme'
import { useLocale } from '@/composables/useLocale'
import { usePermission } from '@/composables/usePermission'
import { useAnalyticsStore } from '@/stores/analytics'
import StableWidth from '@/components/common/StableWidth.vue'

const { redirectTo, redirectToProfile } = useNav()
const themeStore = useThemeStore()
const { t } = useI18n()

const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const { isAuthenticated } = storeToRefs(authStore) // Preserves reactivity
const { hasModuleAccess } = usePermission()
const isInternal = computed(() => hasModuleAccess('SYSTEM', 5))
// Shown to anyone with at least one analytics dashboard (owner or granted viewer).
const { systems: analyticsSystems } = storeToRefs(useAnalyticsStore())

const { locale, setLocale } = useLocale()

const route = useRoute()

// Primary navigation — the two hero modules first, then account-level tools.
// (position:sticky works here now that main.css uses overflow-x:clip.)
const links = computed(() => [
  { key: 'workbench', label: t('nav.workbench'), path: '/', show: true },
  { key: 'house', label: t('nav.house'), path: '/house', show: true },
  { key: 'budget', label: t('nav.budget'), path: '/budget', show: true },
  { key: 'todo', label: t('nav.todo'), path: '/todo', show: true },
  { key: 'trips', label: t('nav.trips'), path: '/travel/trips', show: true },
  { key: 'applePay', label: t('nav.applePay'), path: '/apple-pay', show: isAuthenticated.value },
  { key: 'camera', label: t('nav.camera'), path: '/camera', show: isAuthenticated.value },
  { key: 'analytics', label: t('nav.analytics'), path: '/analytics', show: isAuthenticated.value && analyticsSystems.value.length > 0 },
  { key: 'admin', label: t('nav.admin'), path: '/admin', show: isInternal.value },
].filter((l) => l.show))

const isActive = (path: string) =>
  path === '/' ? route.path === '/' : route.path === path || route.path.startsWith(`${path}/`)
</script>

<template>
  <header class="header">
    <nav class="nav-container">
      <div class="brand clickable" role="link" tabindex="0" @click="redirectTo('/')" @keydown.enter="redirectTo('/')">
        <svg class="brand-mark" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
          <rect width="32" height="32" rx="10" fill="var(--color-primary)" />
          <path d="M8 16.2 16 9l8 7.2V23a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 8 23z" fill="#fff" />
          <circle cx="16" cy="18" r="2.6" fill="var(--color-accent)" />
        </svg>
        <span class="brand-name">AWENSE</span>
      </div>

      <div class="primary-links">
        <button
          v-for="l in links"
          :key="l.key"
          type="button"
          class="primary-link"
          :class="{ active: isActive(l.path) }"
          @click="redirectTo(l.path)"
        >
          {{ l.label }}
        </button>
      </div>

      <div class="nav-links">
        <div class="lang-toggle">
          <button type="button" :class="{ active: locale === 'en' }" @click="setLocale('en')">EN</button>
          <button type="button" :class="{ active: locale === 'zh' }" @click="setLocale('zh')">中</button>
        </div>
        <button type="button" class="icon-btn" :aria-label="t('nav.toggleTheme')" @click="themeStore.toggle()">
          <svg v-if="themeStore.isDark" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="1.6" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="1.6" />
          </svg>
        </button>
        <span v-if="!isAuthenticated" class="auth-btn">
          <el-button class="auth-full" @click="layoutStore.loginDialog.toggle()" type="primary" :icon="Star" size="small">
            <StableWidth path="nav.login" />
          </el-button>
          <button type="button" class="icon-btn auth-icon" :aria-label="t('nav.login')" @click="layoutStore.loginDialog.toggle()">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
            </svg>
          </button>
        </span>
        <span v-else class="auth-btn">
          <el-button class="auth-full" @click="redirectToProfile()" type="primary" :icon="User" size="small">
            <StableWidth path="nav.profile" />
          </el-button>
          <button type="button" class="icon-btn auth-icon" :aria-label="t('nav.profile')" @click="redirectToProfile()">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.6" />
              <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </button>
        </span>
        <button
          type="button"
          class="icon-btn menu-btn"
          :aria-label="t('nav.menu')"
          @click="layoutStore.mobileNavMenu.toggle()"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="1.6" />
          </svg>
        </button>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 9999;
  padding: 0 1em;
  background-color: color-mix(in srgb, var(--color-background-soft) 88%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-divider);
  height: 64px;
  display: flex;
  align-items: center;
  width: 100%;
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  margin: 0 auto;
  flex: 1;
  max-width: 1200px;
}

/* Brand */
.brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--color-primary);
}
.brand-name {
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: 0.04em;
  color: var(--color-heading);
}

/* Primary links */
.primary-links {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
}
.primary-link {
  font-size: 0.9rem;
  font-weight: 700;
  padding: 0.45rem 0.95rem;
  background: none;
  border: none;
  border-radius: 999px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.primary-link:hover {
  color: var(--color-primary);
  background: var(--color-primary-soft);
}
.primary-link.active {
  color: #fff;
  background: var(--color-primary);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon-btn {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  color: var(--color-text);
  cursor: pointer;
}
.icon-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.menu-btn {
  display: none;
}
.auth-icon {
  display: none;
}

.lang-toggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  overflow: hidden;
}
.lang-toggle button {
  padding: 6px 9px;
  font-size: 0.74rem;
  font-weight: 800;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text);
  opacity: 0.55;
  line-height: 1;
}
.lang-toggle button.active {
  background: var(--color-primary);
  color: #fff;
  opacity: 1;
}

.clickable {
  cursor: pointer;
}

/* Small phones: login / profile shrink to the same 32px circle as the other header icons */
@media (max-width: 600px) {
  .auth-full {
    display: none;
  }
  .auth-icon {
    display: inline-grid;
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
  }
  .auth-icon:hover {
    color: #fff;
    opacity: 0.9;
  }
}

/* Mobile: links move into the MobileNavigation dialog */
@media (max-width: 800px) {
  .primary-links {
    display: none;
  }
  .menu-btn {
    display: inline-grid;
  }
  .nav-container {
    gap: 0.75rem;
  }
  .nav-links {
    margin-left: auto;
    gap: 0.5rem;
  }
}
</style>
