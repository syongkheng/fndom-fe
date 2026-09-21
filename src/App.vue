<script setup lang="ts">
import FooterNavigation from './components/navigations/FooterNavigation.vue'
import TopNavigation from './components/navigations/TopNavigation.vue'
import SideNavigation from './components/navigations/SideNavigation.vue'
import MobileNavigation from './components/navigations/MobileNavigation.vue'
import LoginView from './components/views/LoginView.vue'
import { useRoute } from 'vue-router'
import { onMounted, onUnmounted, ref, watch } from 'vue'
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

// Scroll-aware header — only on the immersive home hero (elsewhere the header
// stays permanently visible). .wrapper's height is content-based here (no
// height:100% anchor anywhere from html/body down), so it never actually
// overflows internally despite its own overflow-y:auto — the whole page
// (header + main + footer) just grows taller than the viewport and the
// window/document scrolls instead. Hence a window listener, not @scroll on
// .wrapper.
const headerHiddenRaw = ref(false)
let lastScrollY = 0

function handleWindowScroll() {
  const sy = window.scrollY
  if (sy <= 0) {
    headerHiddenRaw.value = false
  } else if (sy > lastScrollY) {
    headerHiddenRaw.value = true // scrolling down
  } else {
    headerHiddenRaw.value = false // scrolling up
  }
  lastScrollY = sy
}

onMounted(() => window.addEventListener('scroll', handleWindowScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', handleWindowScroll))

watch(() => route.name, () => {
  headerHiddenRaw.value = false
  lastScrollY = 0
})
</script>

<template>
  <el-config-provider :locale="epLocale" :message="{ placement: 'bottom' }">
  <AppInitializer>
    <TopNavigation :hidden="route.name === 'home' && headerHiddenRaw" />
    <div style="display: flex">
      <!-- <SideNavigation /> -->
      <MobileNavigation />
      <main>
        <div class="wrapper" :class="{ 'wrapper--fullbleed': ['llm', 'llm-chat', 'home'].includes(route.name as string) }">
          <RouterView />
        </div>
        <footer v-if="route.name !== 'llm-chat'">
          <FooterNavigation />
        </footer>
      </main>
    </div>
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
  min-height: calc(100vh - 80px - 220px);
  justify-content: center;
  width: 100%;
}

.wrapper--fullbleed {
  padding: 0;
  justify-content: flex-start;
  min-height: 0;
}

main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* important to allow children to scroll properly */
}

footer {
  flex-shrink: 0;
  /* prevent footer from shrinking */
}

@media (max-width: 800px) {
  .wrapper {
    padding: 0.5em;
  }
}
</style>
