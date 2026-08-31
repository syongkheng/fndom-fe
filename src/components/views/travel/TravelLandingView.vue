<script setup lang="ts">
import { useAuthenticationStore } from '@/stores/authentication'
import { useLayoutStateStore } from '@/stores/layoutState'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

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
      <img src="/hero-explore.png" :alt="t('travel.landing.heroImageAlt')" class="hero-photo" />
      <div class="hero-scrim" aria-hidden="true" />

      <div class="hero-glass">
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
    </section>

    <div class="hero-badge-row">
      <div class="hero-badge">{{ t('landing.badge1') }}</div>
      <div class="hero-badge">{{ t('landing.badge2') }}</div>
    </div>

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
  position: relative;
  margin: 28px 0 8px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 50px color-mix(in srgb, var(--el-color-primary) 16%, rgba(0, 0, 0, 0.28));
}

.hero-photo {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  object-position: 50% 52%;
}

.hero-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    115deg,
    rgba(10, 10, 8, 0.55) 0%,
    rgba(10, 10, 8, 0.24) 38%,
    rgba(10, 10, 8, 0) 62%
  );
  pointer-events: none;
}

.hero-glass {
  position: absolute;
  left: 28px;
  bottom: 28px;
  max-width: 400px;
  padding: 26px 28px 24px;
  border-radius: 18px;
  background: rgba(20, 18, 15, 0.36);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
  color: #fff;
}

.hero-eyebrow {
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: color-mix(in srgb, var(--el-color-primary) 55%, white);
  margin-bottom: 12px;
}

.hero-title {
  font-size: 2.1rem;
  font-weight: 800;
  line-height: 1.16;
  color: #fff;
  margin-bottom: 12px;
}

.hero-subtitle {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.55;
  margin-bottom: 20px;
}

.hero-cta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.hero-glass :deep(.el-button.is-plain) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.55);
  color: #fff;
}

.hero-glass :deep(.el-button.is-plain:hover) {
  background: rgba(255, 255, 255, 0.22);
  border-color: #fff;
  color: #fff;
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
  font-size: 13px;
  color: rgba(255, 255, 255, 0.78);
}

.check-icon {
  width: 18px;
  height: 18px;
  color: rgba(255, 255, 255, 0.85);
  flex-shrink: 0;
}

.hero-badge-row {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 24px;
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
  .hero { margin-top: 16px; border-radius: 18px; }
  .hero-photo { aspect-ratio: 3 / 4; object-position: 50% 58%; }
  .hero-glass {
    left: 14px;
    right: 14px;
    bottom: 14px;
    max-width: none;
    padding: 20px 20px 18px;
  }
  .hero-title { font-size: 1.65rem; }
  .hero-subtitle { font-size: 0.86rem; }
  .hero-cta { flex-direction: column; }
  .hero-cta :deep(.el-button) { width: 100%; margin-left: 0 !important; }
}

@media (min-width: 640px) {
  .feature-grid { grid-template-columns: repeat(2, 1fr); }
  .feature-card { flex-direction: column; align-items: flex-start; }
}
</style>
