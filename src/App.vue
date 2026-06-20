<script setup lang="ts">
import FooterNavigation from './components/navigations/FooterNavigation.vue'
import TopNavigation from './components/navigations/TopNavigation.vue'
import SideNavigation from './components/navigations/SideNavigation.vue'
import MobileNavigation from './components/navigations/MobileNavigation.vue'
import LoginView from './components/views/LoginView.vue'
import { useRoute } from 'vue-router'
import { watch } from 'vue'
import { useLayoutStateStore } from './stores/layoutState'
import { useThemeStore } from './stores/theme'
import AppInitializer from './AppInitializer.vue'
import LoadingDialog from './components/dialogs/LoadingDialog.vue'
import { useLocale } from './composables/useLocale'

const route = useRoute()
const layoutStore = useLayoutStateStore()
useThemeStore() // initialises on first call — applies dark/light class before render
const { epLocale } = useLocale()

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
      <!-- <SideNavigation /> -->
      <MobileNavigation />
      <main>
        <div class="wrapper" :class="{ 'wrapper--fullbleed': ['llm', 'llm-chat'].includes(route.name as string) }">
          <RouterView />
        </div>
        <footer v-if="route.name !== 'llm-chat'">
          <FooterNavigation />
        </footer>
      </main>
    </div>
    <LoginView />
    <LoadingDialog :is-open="layoutStore.loadingDialog.isVisible" />
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
  width: 100vw;
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
