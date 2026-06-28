<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useMarketplaceStore } from '@/stores/marketplace'
import { useAuthenticationStore } from '@/stores/authentication'
import { useLayoutStateStore } from '@/stores/layoutState'
import ModelCard from './ModelCard.vue'
import type { LLMModel } from '@/interfaces/Marketplace.model'

const store       = useMarketplaceStore()
const authStore   = useAuthenticationStore()
const layoutStore = useLayoutStateStore()
const router      = useRouter()
const { t }       = useI18n()
const { isAuthenticated } = storeToRefs(authStore)

onMounted(() => {
  store.fetchModels()
  if (isAuthenticated.value) {
    store.fetchWallet()
    store.fetchTrialKey()
  }
})

function formatBalance(cents: number, currency: string): string {
  const symbol = currency === 'SGD' ? 'S$' : '$'
  return `${symbol}${(cents / 100).toFixed(2)}`
}

type Filter = 'All' | 'Anthropic' | 'OpenAI' | 'Google' | 'Meta'
const activeFilter = ref<Filter>('All')
const filters: Filter[] = ['All', 'Anthropic', 'OpenAI', 'Google', 'Meta']

const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: '#C84B31',
  OpenAI:    '#10a37f',
  Google:    '#4285F4',
  Meta:      '#0082FB',
}

const filtered = computed<LLMModel[]>(() =>
  activeFilter.value === 'All'
    ? store.models
    : store.models.filter(m => m.provider === activeFilter.value),
)
</script>

<template>
  <div class="marketplace">

    <!-- Hero -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-eyebrow">{{ t('marketplace.hero.eyebrow') }} <span class="beta">{{ t('marketplace.hero.beta') }}</span></div>
        <h1 class="hero-heading">{{ t('marketplace.hero.heading') }}</h1>
        <p class="hero-sub">
          {{ t('marketplace.hero.sub1') }}<br>
          {{ t('marketplace.hero.sub2') }}
        </p>
        <div class="hero-stats">
          <div class="stat">
            <span class="stat-num">8</span>
            <span class="stat-label">{{ t('marketplace.hero.stats.models') }}</span>
          </div>
          <div class="stat-sep" />
          <div class="stat">
            <span class="stat-num">4</span>
            <span class="stat-label">{{ t('marketplace.hero.stats.providers') }}</span>
          </div>
          <div class="stat-sep" />
          <div class="stat">
            <span class="stat-num">2M</span>
            <span class="stat-label">{{ t('marketplace.hero.stats.maxContext') }}</span>
          </div>
          <div class="stat-sep" />
          <div class="stat">
            <span class="stat-num">$0.10</span>
            <span class="stat-label">{{ t('marketplace.hero.stats.from') }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Account bar (authenticated only) -->
    <div v-if="isAuthenticated" class="account-bar">
      <div class="account-bar-inner">
        <div class="account-balance">
          <span class="account-label">{{ t('marketplace.accountBar.balance') }}</span>
          <span class="account-value">
            {{ store.wallet ? formatBalance(store.wallet.balance, store.wallet.currency) : '—' }}
          </span>
        </div>
        <div class="account-actions">
          <el-button size="small" @click="router.push('/llm/wallet')">{{ t('marketplace.accountBar.topUp') }}</el-button>
          <el-button size="small" @click="router.push('/llm/api-key')">{{ t('marketplace.accountBar.apiKey') }}</el-button>
        </div>
      </div>
    </div>

    <!-- Public sign-in banner (unauthenticated only) -->
    <div v-else class="public-banner">
      <span class="public-banner-notice">{{ t('marketplace.public.notice') }}</span>
      <el-button size="small" type="primary" @click="layoutStore.loginDialog.toggle()">
        {{ t('marketplace.public.signIn') }}
      </el-button>
    </div>

    <!-- Models -->
    <section class="models-section">
      <div class="models-inner">

        <!-- Filter bar -->
        <div class="filter-bar">
          <button
            v-for="f in filters"
            :key="f"
            class="filter-btn"
            :class="{ 'filter-btn--active': activeFilter === f }"
            :style="activeFilter === f && f !== 'All' ? { '--fc': PROVIDER_COLORS[f] } : {}"
            @click="activeFilter = f"
          >
            <span
              v-if="f !== 'All'"
              class="filter-dot"
              :style="{ background: PROVIDER_COLORS[f] }"
            />
            {{ f === 'All' ? t('marketplace.filter.all') : f }}
          </button>
          <span class="filter-count">{{ t('marketplace.filter.count', { n: filtered.length }) }}</span>
        </div>

        <!-- Grid -->
        <div class="models-grid">
          <ModelCard
            v-for="model in filtered"
            :key="model.id"
            :model="model"
            :isAuthenticated="isAuthenticated"
          />
        </div>

      </div>
    </section>

  </div>
</template>

<style scoped>
.marketplace {
  width: 100%;
  min-height: calc(100vh - 80px);
  overflow-y: auto;
  background: var(--color-background);
}

/* ── Hero ───────────────────────────────────────────────── */
.hero {
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -80px;
  right: -60px;
  width: 500px;
  height: 500px;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--el-color-primary) 8%, transparent) 0%,
    transparent 65%
  );
  pointer-events: none;
}

.hero-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 56px 32px 52px;
  position: relative;
  z-index: 1;
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--el-color-primary);
  margin-bottom: 14px;
}

.beta {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 1px 6px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  color: var(--el-color-primary);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 25%, transparent);
  opacity: 1;
}

.hero-heading {
  font-size: 2.75rem;
  font-weight: 900;
  color: var(--color-heading);
  letter-spacing: -0.5px;
  line-height: 1.15;
  margin: 0 0 16px;
}

.hero-sub {
  font-size: 1rem;
  color: var(--color-text);
  opacity: 0.55;
  line-height: 1.7;
  margin: 0 0 32px;
  max-width: 540px;
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stat-num {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--color-heading);
  line-height: 1;
}

.stat-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.4;
}

.stat-sep {
  width: 1px;
  height: 28px;
  background: var(--color-border);
}

/* ── Account bar ────────────────────────────────────────── */
.account-bar {
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);
}

.public-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 12px 32px;
  border-bottom: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--el-color-primary) 5%, var(--color-background));
}

.public-banner-notice {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.account-bar-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.account-balance {
  display: flex;
  align-items: center;
  gap: 8px;
}

.account-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.4;
}

.account-value {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-heading);
}

.account-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 640px) {
  .account-bar-inner {
    padding: 10px 16px;
  }
}

/* ── Models section ─────────────────────────────────────── */
.models-section {
  padding: 0 0 64px;
}

.models-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 32px 0;
}

/* Filter bar */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: transparent;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text);
  opacity: 0.65;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, opacity 0.12s;
}

.filter-btn:hover {
  opacity: 1;
  background: var(--color-background-mute);
}

.filter-btn--active {
  opacity: 1;
  background: var(--color-background-soft);
  border-color: var(--fc, var(--el-color-primary));
  color: var(--fc, var(--el-color-primary));
  font-weight: 700;
}

.filter-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.filter-count {
  margin-left: auto;
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.35;
}

/* Grid */
.models-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* ── Responsive ─────────────────────────────────────────── */
@media (max-width: 1024px) {
  .models-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .hero-inner {
    padding: 36px 20px 32px;
  }

  .hero-heading {
    font-size: 1.9rem;
  }

  .models-inner {
    padding: 24px 16px 0;
  }

  .models-grid {
    grid-template-columns: 1fr;
  }
}
</style>
