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
      <SideNavigation />
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
  </AppInitializer>
</template>

<style scoped>
.wrapper {
  padding: 1em;
  height: calc(100vh - 80px - 150px);
  overflow: auto;
}

main {
  display: flex;
  flex-direction: column;
  flex: 1;
}
</style>
