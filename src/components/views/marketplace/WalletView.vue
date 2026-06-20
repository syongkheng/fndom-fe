<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useMarketplaceStore } from '@/stores/marketplace'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import type { TopupDto } from '@/interfaces/Marketplace.model'

const router  = useRouter()
const store   = useMarketplaceStore()

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
    ElMessage.warning('Please select or enter an amount.')
    return
  }
  try {
    topupLoading.value = true
    await store.topUp(cents, paymentMethod.value)
    ElMessage.success(`Topped up ${formatBalance(cents, 'SGD')} successfully.`)
    selectedAmount.value = null
    customAmount.value   = ''
  } catch {
    ElMessage.error('Top-up failed. Please try again.')
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
      <el-button text size="small" class="back-btn" @click="router.push('/marketplace')">
        ← Marketplace
      </el-button>
      <h2 class="wallet-title">Wallet</h2>
    </header>

    <div class="wallet-body">

      <!-- Balance card -->
      <div class="balance-card">
        <div class="balance-label">Available Balance</div>
        <div class="balance-amount">
          {{ store.wallet ? formatBalance(store.wallet.balance, store.wallet.currency) : '—' }}
        </div>
        <div class="balance-currency">{{ store.wallet?.currency ?? 'SGD' }}</div>
      </div>

      <!-- Top-up card -->
      <div class="topup-card">
        <div class="card-title">Top Up</div>

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
          placeholder="Custom amount (e.g. 30)"
          class="custom-input"
          prefix="S$"
          @focus="selectedAmount = null"
        />

        <!-- Payment method -->
        <el-radio-group v-model="paymentMethod" class="payment-group">
          <el-radio value="card">Card</el-radio>
          <el-radio value="paynow">PayNow</el-radio>
        </el-radio-group>

        <!-- Mock notice -->
        <p class="mock-notice">Payment processing is mocked — no real charge will be made.</p>

        <el-button
          type="primary"
          :loading="topupLoading"
          :disabled="!getEffectiveAmountCents()"
          class="topup-btn"
          @click="handleTopup"
        >
          Top Up {{ getEffectiveAmountCents() ? formatBalance(getEffectiveAmountCents()!, 'SGD') : '' }}
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
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 32px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
  min-height: 52px;
}

.back-btn {
  opacity: 0.55;
  font-size: 0.82rem;
  padding: 14px 0;
  transition: opacity 0.15s;
}
.back-btn:hover { opacity: 1; }

.wallet-title {
  font-size: 0.95rem;
  font-weight: 700;
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
