<script setup lang="ts">
import { useNav } from '@/hooks/useNav'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useAuthenticationStore } from '@/stores/authentication'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const navigate = useNav()
const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const { isAuthenticated } = storeToRefs(authStore)
const { t } = useI18n()

const features = [
  { icon: '✈️', key: 'planning' },
  { icon: '🗺️', key: 'itineraries' },
  { icon: '🏔️', key: 'destinations' },
]
</script>

<template>
  <div class="landing">

    <!-- Hero -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow">{{ t('landing.eyebrow') }}</p>
        <h1 class="hero-title" style="white-space: pre-line">{{ t('landing.title') }}</h1>
        <p class="hero-subtitle">{{ t('landing.subtitle') }}</p>
        <div class="hero-cta">
          <el-button type="primary" size="large" @click="navigate.redirectTo('/travel')">
            {{ t('landing.startPlanning') }}
          </el-button>
          <el-button v-if="!isAuthenticated" size="large" plain @click="layoutStore.loginDialog.toggle()">
            {{ t('nav.login') }}
          </el-button>
        </div>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <span class="hero-emoji">🌏</span>
      </div>
    </section>

    <!-- Feature cards -->
    <section class="features">
      <div class="feature-grid">
        <div v-for="f in features" :key="f.key" class="feature-card">
          <span class="feature-icon">{{ f.icon }}</span>
          <h3 class="feature-title">{{ t(`landing.features.${f.key}.title`) }}</h3>
          <p class="feature-desc">{{ t(`landing.features.${f.key}.desc`) }}</p>
        </div>
      </div>
    </section>

    <!-- Footer note -->
    <i18n-t keypath="landing.footerNote" tag="p" class="landing-footer-note">
      <template #link>
        <span class="hyperlink" @click="layoutStore.loginDialog.toggle()">{{ t('landing.signingIn') }}</span>
      </template>
    </i18n-t>

  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 80px);
  padding: 0 16px 60px;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

/* ── Hero ───────────────────────────────── */
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  padding: 72px 0 56px;
}

.hero-inner {
  flex: 1;
  min-width: 0;
}

.hero-eyebrow {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--el-color-primary);
  margin-bottom: 12px;
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.1;
  color: var(--color-heading);
  margin-bottom: 18px;
}

.hero-subtitle {
  font-size: 1rem;
  color: var(--color-text-secondary);
  line-height: 1.65;
  max-width: 460px;
  margin-bottom: 32px;
}

.hero-cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-visual {
  flex-shrink: 0;
  font-size: 8rem;
  line-height: 1;
  opacity: 0.18;
  user-select: none;
}

/* ── Features ───────────────────────────── */
.features {
  padding: 8px 0 40px;
}

.feature-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.feature-card {
  padding: 24px 20px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background-soft);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.feature-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.feature-icon {
  font-size: 1.8rem;
  display: block;
  margin-bottom: 10px;
}

.feature-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 6px;
}

.feature-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.55;
}

/* ── Footer note ────────────────────────── */
.landing-footer-note {
  text-align: center;
  font-size: 0.82rem;
  color: var(--color-text-tertiary);
  margin-top: auto;
  padding-top: 24px;
}

/* ── Responsive ─────────────────────────── */
@media (max-width: 600px) {
  .hero {
    flex-direction: column;
    padding: 48px 0 40px;
    text-align: center;
  }

  .hero-subtitle {
    max-width: 100%;
  }

  .hero-cta {
    justify-content: center;
  }

  .hero-visual {
    font-size: 5rem;
  }

  .hero-title {
    font-size: 2.2rem;
  }
}

@media (min-width: 640px) {
  .feature-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
