<script setup lang="ts">
import FooterNavigation from './components/navigations/FooterNavigation.vue'
import TopNavigation from './components/navigations/TopNavigation.vue'
import MobileNavigation from './components/navigations/MobileNavigation.vue'
import BottomTabBar from './components/navigations/BottomTabBar.vue'
import LoginView from './components/views/LoginView.vue'
import { useRoute } from 'vue-router'
import { watch } from 'vue'
import { useLayoutStateStore } from './stores/layoutState'
import { useThemeStore } from './stores/theme'
import AppInitializer from './AppInitializer.vue'
import LoadingDialog from './components/dialogs/LoadingDialog.vue'
import ToastHost from './components/common/ToastHost.vue'
import { useLocale } from './composables/useLocale'
import { usePageTracking } from './composables/usePageTracking'

const route = useRoute()
const layoutStore = useLayoutStateStore()
useThemeStore() // initialises on first call — applies dark/light class before render
const { epLocale } = useLocale()
usePageTracking()

watch(() => route.query.showLogin, (newVal) => {
  if (newVal === 'true') {
    layoutStore.loginDialog.setTrue()
    window.history.replaceState({}, document.title, window.location.pathname)
  }
})
</script>

<template>
  <el-config-provider :locale="epLocale">
  <AppInitializer>
    <TopNavigation />
    <div style="display: flex">
      <MobileNavigation />
      <main>
        <!-- route.meta.fullbleed: edge-to-edge, viewport-height pages (e.g. /house) -->
        <div class="wrapper" :class="{ 'wrapper--fullbleed': !!route.meta.fullbleed }">
          <RouterView />
        </div>
        <footer v-if="!route.meta.hideFooter">
          <FooterNavigation />
        </footer>
      </main>
    </div>
    <BottomTabBar />
    <LoginView />
    <LoadingDialog :is-open="layoutStore.loadingDialog.isVisible" />
    <ToastHost />
  </AppInitializer>
  </el-config-provider>
</template>

<style scoped>
.wrapper {
  display: flex;
  padding: 1em;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  min-height: calc(100vh - 64px - 220px);
  justify-content: center;
  width: 100%;
}

.wrapper--fullbleed {
  padding: 0;
  justify-content: flex-start;
  min-height: 0;
  overflow: hidden;
}

main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* Flex item: without min-width 0, wide content (code blocks, tables)
     stretches <main> past the viewport and gets clipped on mobile */
  min-width: 0;
  /* important to allow children to scroll properly */
}

footer {
  flex-shrink: 0;
  /* prevent footer from shrinking */
}

@media (max-width: 800px) {
  .wrapper:not(.wrapper--fullbleed) {
    padding: 0.5em;
  }

  /* keep content clear of the fixed bottom tab bar */
  main {
    padding-bottom: var(--tabbar-h);
  }
}
</style>
