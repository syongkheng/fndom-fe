<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useAuthenticationStore } from '@/stores/authentication'
import { useNav } from '@/hooks/useNav'

const { t } = useI18n()
const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const { isAuthenticated } = storeToRefs(authStore)
const nav = useNav()

// Touch devices have no hover — click/tap toggles the same floating state
// that :hover drives on desktop, so tapping the figure works the same way.
const isFloating = ref(false)
const handleActivate = () => {
  isFloating.value = !isFloating.value
  // Logged-in: the character is the entry point to the (currently empty,
  // more to come later) dashboard. Logged-out: it's the login prompt.
  if (isAuthenticated.value) {
    nav.redirectToDashboard()
  } else {
    layoutStore.loginDialog.setTrue()
  }
}
</script>

<template>
  <div class="art-hero">
    <img src="/mountain-ridges.png" class="art-bg" alt="" aria-hidden="true" />
    <img
      src="/main-character-transparent.png"
      class="art-character"
      :class="{ 'is-floating': isFloating }"
      :alt="t('travel.landing.heroImageAlt')"
      role="button"
      tabindex="0"
      @click="handleActivate"
      @keyup.enter="handleActivate"
    />
  </div>
</template>

<style scoped>
.art-hero {
  position: relative;
  width: 100%;
  /* Intentionally taller than the header+footer-adjusted viewport on desktop
     — the footer sits below the fold until the user scrolls, instead of the
     page fitting exactly in one screen. html/body/#app have no height:100%
     anchor anywhere in this app, so flex:1 has nothing to grow into here;
     this is a fixed vh value for the same reason the calc below is. */
  height: 100vh;
  min-height: 320px;
  overflow: hidden;
  background: #efe6d3;
}

.art-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 50%;
  display: block;
}

.art-character {
  position: absolute;
  left: 50.5%;
  bottom: 26%;
  width: 14vw;
  min-width: 110px;
  max-width: 260px;
  height: auto;
  transform: translateX(-50%) translateY(0);
  transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1), filter 0.9s ease;
  cursor: pointer;
  filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.25));
}

.art-character:hover,
.art-character.is-floating {
  animation: art-character-float 3.2s ease-in-out infinite;
  filter: drop-shadow(0 34px 22px rgba(0, 0, 0, 0.16));
}

@keyframes art-character-float {
  0%, 100% { transform: translateX(-50%) translateY(-20px); }
  50%      { transform: translateX(-50%) translateY(-34px); }
}

@media (max-width: 640px) {
  .art-hero {
    /* Mobile keeps the snug, no-scroll fit — only desktop pushes the footer
       below the fold. */
    height: calc(100vh - 80px - 220px);
  }

  .art-character {
    width: 20vw;
    bottom: 24%;
  }
}
</style>
