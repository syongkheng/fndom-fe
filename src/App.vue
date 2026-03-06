<script setup lang="ts">
import FooterNavigation from './components/navigations/FooterNavigation.vue'
import TopNavigation from './components/navigations/TopNavigation.vue'
import SideNavigation from './components/navigations/SideNavigation.vue'
import MobileNavigation from './components/navigations/MobileNavigation.vue'
import LoginView from './components/views/LoginView.vue'
import { useRoute } from 'vue-router'
import { watch } from 'vue'
import { useLayoutStateStore } from './stores/layoutState'
import AppInitializer from './AppInitializer.vue'
import LoadingDialog from './components/dialogs/LoadingDialog.vue'

const route = useRoute()
const layoutStore = useLayoutStateStore()

watch(() => route.query.showLogin, (newVal) => {
  if (newVal === 'true') {
    layoutStore.loginDialog.setTrue()
    window.history.replaceState({}, document.title, window.location.pathname)
  }
})
</script>

<template>
  <AppInitializer>
    <TopNavigation />
    <div style="display: flex">
      <!-- <SideNavigation /> -->
      <MobileNavigation />
      <main>
        <div class="wrapper">
          <RouterView />
        </div>
        <footer>
          <FooterNavigation />
        </footer>
      </main>
    </div>
    <LoginView />
    <LoadingDialog :is-open="layoutStore.loadingDialog.isVisible" />
  </AppInitializer>
</template>

<style scoped>
.wrapper {
  display: flex;
  padding: 1em;
  flex: 1;
  /* fill available space in main */
  overflow-y: auto;
  /* enable vertical scrolling if content exceeds height */
  overflow-x: hidden;
  /* prevent horizontal overflow */
  box-sizing: border-box;
  min-height: calc(100vh - 80px - 220px);
  justify-content: center;
  width: 100vw;
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
