<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useMarketplaceStore } from '@/stores/marketplace'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import type { TopupDto } from '@/interfaces/Marketplace.model'

const router  = useRouter()
const store   = useMarketplaceStore()
const { t } = useI18n()

const loading        = ref(false)
const topupLoading   = ref(false)
const topupHistory   = ref<TopupDto[]>([])
const selectedAmount = ref<number | null>(null)
const customAmount   = ref<string>('')
const paymentMethod  = ref<'card' | 'paynow'>('card')

const PRESET_AMOUNTS = [
  { label: 'S$10',  cents: 1000 },
  { label: 'S$25',  cents: 2500 },
  { label: 'S$50',  cents: 5000 },
  { label: 'S$100', cents: 10000 },
]

function formatBalance(cents: number, currency: string): string {
  const symbol = currency === 'SGD' ? 'S$' : '$'
  return `${symbol}${(cents / 100).toFixed(2)}`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

function getEffectiveAmountCents(): number | null {
  if (selectedAmount.value !== null) return selectedAmount.value
  const parsed = parseFloat(customAmount.value)
  if (!isNaN(parsed) && parsed >= 1) return Math.round(parsed * 100)
  return null
}

async function loadHistory() {
  try {
    loading.value = true
    await store.fetchWallet()
    const res = await HttpClient.get(ApiRoute.MARKETPLACE.WALLET)
    topupHistory.value = []
    // History is not returned by wallet endpoint — use a separate call or show from session
    // For now show empty; backend returns wallet only
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

async function handleTopup() {
  const cents = getEffectiveAmountCents()
  if (!cents) {
    ElMessage.warning(t('toast.walletSelectAmount'))
    return
  }
  try {
    topupLoading.value = true
    await store.topUp(cents, paymentMethod.value)
    ElMessage.success(t('toast.walletTopupSuccess', { amount: formatBalance(cents, 'SGD') }))
    selectedAmount.value = null
    customAmount.value   = ''
  } catch {
    ElMessage.error(t('toast.walletTopupFailed'))
  } finally {
    topupLoading.value = false
  }
}

onMounted(loadHistory)
</script>

<template>
  <div class="wallet-page">

    <!-- Header -->
    <header class="wallet-header">
      <div class="wallet-header-inner">
        <button class="back-btn" @click="router.push('/llm')">{{ t('marketplace.back') }}</button>
        <div>
          <p class="wallet-eyebrow">{{ t('marketplace.hero.eyebrow') }}</p>
          <h1 class="wallet-title">{{ t('marketplace.wallet.title') }}</h1>
        </div>
      </div>
    </header>

    <div class="wallet-body">

      <!-- Balance card -->
      <div class="balance-card">
        <div class="balance-label">{{ t('marketplace.wallet.balance') }}</div>
        <div class="balance-amount">
          {{ store.wallet ? formatBalance(store.wallet.balance, store.wallet.currency) : '—' }}
        </div>
        <div class="balance-currency">{{ store.wallet?.currency ?? 'SGD' }}</div>
      </div>

      <!-- Top-up card -->
      <div class="topup-card">
        <div class="card-title">{{ t('marketplace.wallet.topUp') }}</div>

        <!-- Preset amounts -->
        <div class="preset-grid">
          <button
            v-for="p in PRESET_AMOUNTS"
            :key="p.cents"
            class="preset-btn"
            :class="{ 'preset-btn--active': selectedAmount === p.cents }"
            @click="selectedAmount = selectedAmount === p.cents ? null : p.cents; customAmount = ''"
          >
            {{ p.label }}
          </button>
        </div>

        <!-- Custom amount -->
        <el-input
          v-model="customAmount"
          :placeholder="t('marketplace.wallet.customPlaceholder')"
          class="custom-input"
          prefix="S$"
          @focus="selectedAmount = null"
        />

        <!-- Payment method -->
        <el-radio-group v-model="paymentMethod" class="payment-group">
          <el-radio value="card">{{ t('marketplace.wallet.payCard') }}</el-radio>
          <el-radio value="paynow">{{ t('marketplace.wallet.payPaynow') }}</el-radio>
        </el-radio-group>

        <!-- Mock notice -->
        <p class="mock-notice">{{ t('marketplace.wallet.mockNotice') }}</p>

        <el-button
          type="primary"
          :loading="topupLoading"
          :disabled="!getEffectiveAmountCents()"
          class="topup-btn"
          @click="handleTopup"
        >
          {{ t('marketplace.wallet.topUp') }} {{ getEffectiveAmountCents() ? formatBalance(getEffectiveAmountCents()!, 'SGD') : '' }}
        </el-button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.wallet-page {
  width: 100%;
  min-height: calc(100vh - 80px);
  background: var(--color-background);
  overflow-y: auto;
}

/* ── Header ──────────────────────────────────────────────── */
.wallet-header {
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
  padding: 20px 32px 22px;
}

.wallet-header-inner {
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.back-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.45;
  transition: opacity 0.15s;
  text-align: left;
}
.back-btn:hover { opacity: 0.85; }

.wallet-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}

.wallet-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-heading);
  margin: 0;
}

/* ── Body ────────────────────────────────────────────────── */
.wallet-body {
  max-width: 560px;
  margin: 0 auto;
  padding: 32px 24px 64px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Balance card ────────────────────────────────────────── */
.balance-card {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-background-soft);
  padding: 28px 24px;
  text-align: center;
}

.balance-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text);
  opacity: 0.4;
  margin-bottom: 8px;
}

.balance-amount {
  font-size: 2.6rem;
  font-weight: 900;
  color: var(--color-heading);
  letter-spacing: -0.5px;
  line-height: 1;
}

.balance-currency {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.3;
  margin-top: 6px;
}

/* ── Top-up card ─────────────────────────────────────────── */
.topup-card {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-background-soft);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-title {
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.5;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.preset-btn {
  padding: 10px 6px;
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  background: transparent;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s, color 0.12s;
}

.preset-btn:hover {
  background: var(--color-background-mute);
}

.preset-btn--active {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 6%, transparent);
}

.custom-input :deep(.el-input__prefix-inner) {
  font-size: 0.85rem;
  font-weight: 600;
  opacity: 0.6;
}

.payment-group {
  display: flex;
  gap: 16px;
}

.mock-notice {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.35;
  margin: 0;
}

.topup-btn {
  width: 100%;
  height: 42px;
  font-size: 0.9rem;
  font-weight: 600;
}

/* ── Mobile ──────────────────────────────────────────────── */
@media (max-width: 640px) {
  .wallet-header { padding: 0 16px; }
  .wallet-body   { padding: 20px 16px 48px; }

  .preset-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
