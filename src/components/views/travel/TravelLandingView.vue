<script setup lang="ts">
import { useAuthenticationStore } from '@/stores/authentication'
import { useLayoutStateStore } from '@/stores/layoutState'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import HeroIllustration from '@/components/illustrations/HeroIllustration.vue'

const authStore   = useAuthenticationStore()
const layoutStore = useLayoutStateStore()
const router      = useRouter()
const { t }       = useI18n()
const { isAuthenticated } = storeToRefs(authStore)

const features = [
  {
    icon: '🗺️',
    title: t('landing.features.planning.title'),
    desc:  t('landing.features.planning.desc'),
  },
]
</script>

<template>
  <div class="travel-landing">

    <!-- Hero -->
    <section class="hero">
      <div class="hero-copy">
        <p class="hero-eyebrow">{{ t('travel.landing.eyebrow') }}</p>
        <h1 class="hero-title" style="white-space: pre-line">{{ t('travel.landing.title') }}</h1>
        <p class="hero-subtitle">{{ t('travel.landing.subtitle') }}</p>
        <div class="hero-cta">
          <el-button type="primary" size="large" @click="router.push('/travel/draft')">
            {{ t('travel.landing.startPlanning') }}
          </el-button>
          <template v-if="isAuthenticated">
            <el-button size="large" plain @click="router.push('/travel/trips')">
              {{ t('travel.landing.myTrips') }}
            </el-button>
          </template>
          <template v-else>
            <el-button size="large" plain @click="layoutStore.loginDialog.toggle()">
              {{ t('travel.landing.signIn') }}
            </el-button>
          </template>
        </div>
        <ul class="hero-highlights">
          <li>
            <svg class="check-icon" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="8.5" stroke="currentColor" stroke-width="1"/>
              <path d="M5 9l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>{{ t('landing.highlights.h1') }}</span>
          </li>
        </ul>
      </div>

      <div class="hero-visual">
        <div class="hero-illustration-wrap">
          <HeroIllustration />
        </div>
        <div class="hero-badge-row">
          <div class="hero-badge">{{ t('landing.badge1') }}</div>
          <div class="hero-badge">{{ t('landing.badge2') }}</div>
        </div>
      </div>
    </section>

    <!-- Feature cards -->
    <section class="features">
      <p class="section-eyebrow">{{ t('landing.features.eyebrow') }}</p>
      <h2 class="section-title">{{ t('landing.features.planning.title') }}</h2>
      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon-wrap">🗺️</div>
          <div class="feature-body">
            <h3 class="feature-title">{{ t('landing.features.planning.title') }}</h3>
            <p class="feature-desc">{{ t('landing.features.planning.desc') }}</p>
          </div>
        </div>
        <div class="feature-card">
          <div class="feature-icon-wrap">✈️</div>
          <div class="feature-body">
            <h3 class="feature-title">{{ t('landing.trust.travel') }}</h3>
            <p class="feature-desc">{{ t('travel.landing.subtitle') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA banner -->
    <section class="cta-banner">
      <svg class="cta-dots" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="travel-dot-grid" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#travel-dot-grid)" />
      </svg>
      <div class="cta-inner">
        <h2 class="cta-heading">{{ t('travel.landing.cta.heading') }}</h2>
        <p class="cta-sub">{{ t('travel.landing.cta.sub') }}</p>
        <div class="cta-actions">
          <el-button type="primary" size="large" @click="router.push('/travel/draft')">
            {{ t('travel.landing.cta.action') }}
          </el-button>
          <el-button size="large" plain @click="layoutStore.loginDialog.toggle()">
            {{ t('travel.landing.cta.secondary') }}
          </el-button>
        </div>
      </div>
    </section>

    <i18n-t keypath="travel.landing.footerNote" tag="p" class="travel-footer-note">
      <template #link>
        <span class="hyperlink" @click="layoutStore.loginDialog.toggle()">{{ t('travel.landing.signingIn') }}</span>
      </template>
    </i18n-t>

  </div>
</template>

<style scoped>
.travel-landing {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 80px);
  padding: 0 16px 60px;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

/* ── Hero ───────────────────────────────────────────── */
.hero {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 56px;
  align-items: center;
  padding: 64px 0 32px;
  position: relative;
}

.hero::before {
  content: '';
  position: absolute;
  top: -80px;
  right: -60px;
  width: 460px;
  height: 460px;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--el-color-primary) 8%, transparent) 0%,
    transparent 68%
  );
  pointer-events: none;
  z-index: 0;
}

.hero-copy { position: relative; z-index: 1; }
.hero-visual { position: relative; z-index: 1; }
.hero-illustration-wrap { width: 100%; }

.hero-eyebrow {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--el-color-primary);
  margin-bottom: 14px;
}

.hero-title {
  font-size: 2.9rem;
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
  margin-bottom: 28px;
}

.hero-cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 28px;
}

.hero-highlights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hero-highlights li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: var(--color-text-secondary);
}

.check-icon {
  width: 18px;
  height: 18px;
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.hero-badge-row {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--el-color-primary) 30%, transparent);
}

/* ── Features ────────────────────────────────────────── */
.section-eyebrow {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--el-color-primary);
  margin-bottom: 8px;
  margin-top: 40px;
}

.section-title {
  font-size: 1.55rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 24px;
}

.features { padding-bottom: 16px; }

.feature-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.feature-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 22px 20px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-background-soft);
  transition: border-color 0.16s, background 0.16s, box-shadow 0.16s;
}

.feature-card:hover {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 4%, var(--color-background-soft));
  box-shadow: 0 4px 16px color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}

.feature-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  font-size: 1.4rem;
  flex-shrink: 0;
}

.feature-body { flex: 1; min-width: 0; }

.feature-title {
  font-size: 0.97rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 6px;
}

.feature-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.55;
}

/* ── CTA banner ──────────────────────────────────────── */
.cta-banner {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 22%, transparent);
  background: color-mix(in srgb, var(--el-color-primary) 7%, var(--color-background-soft));
  margin-top: 32px;
  margin-bottom: 8px;
  text-align: center;
  padding: 52px 32px;
}

.cta-dots {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  color: var(--el-color-primary);
  opacity: 0.07;
  pointer-events: none;
}

.cta-inner { position: relative; z-index: 1; }

.cta-heading {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 10px;
}

.cta-sub {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  margin-bottom: 28px;
}

.cta-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

/* ── Footer note ─────────────────────────────────────── */
.travel-footer-note {
  text-align: center;
  font-size: 0.82rem;
  color: var(--color-text-tertiary);
  margin-top: auto;
  padding-top: 24px;
}

.hyperlink {
  color: var(--el-color-primary);
  cursor: pointer;
  text-decoration: underline;
}

/* ── Responsive ──────────────────────────────────────── */
@media (max-width: 720px) {
  .hero {
    grid-template-columns: 1fr;
    padding: 40px 0 24px;
    text-align: center;
  }
  .hero::before { display: none; }
  .hero-subtitle { max-width: 100%; }
  .hero-cta { justify-content: center; }
  .hero-highlights { align-items: center; }
  .hero-visual { display: none; }
  .hero-title { font-size: 2.2rem; }
}

@media (min-width: 640px) {
  .feature-grid { grid-template-columns: repeat(2, 1fr); }
  .feature-card { flex-direction: column; align-items: flex-start; }
}
</style>
