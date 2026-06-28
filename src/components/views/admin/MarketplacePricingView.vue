<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'

const router = useRouter()
const { t } = useI18n()
const loading        = ref(true)
const saving         = ref<string | null>(null)
const savingSettings = ref(false)

interface AdminRow {
  modelId:            string
  displayName:        string
  provider:           string
  providerColor:      string
  contextWindow:      string
  maxOutputTokens:    string
  badge:              string | null
  isActive:           boolean
  sortOrder:          number
  _input:  number   // USD/MTok, editing
  _output: number   // USD/MTok, editing
  _badge:  string
  _active: boolean
}

const rows = ref<AdminRow[]>([])
const exchangeRate = ref(1.35)
const markupPct    = ref(20)

function calcPreview(usdMtok: number): string {
  const cents = Math.ceil(usdMtok / 1000 * exchangeRate.value * (1 + markupPct.value / 100) * 100)
  return `S$${(cents / 100).toFixed(3)}/1K`
}

async function load() {
  loading.value = true
  try {
    const [modelsRes, settingsRes] = await Promise.all([
      HttpClient.get(ApiRoute.MARKETPLACE.ADMIN_MODELS),
      HttpClient.get(ApiRoute.MARKETPLACE.ADMIN_SETTINGS),
    ])
    const raw = modelsRes.data.data.models as Array<{
      modelId: string; displayName: string; provider: string; providerColor: string
      inputPriceUsdMtok: number; outputPriceUsdMtok: number
      contextWindow: string; maxOutputTokens: string
      badge: string | null; isActive: boolean; sortOrder: number
    }>
    rows.value = raw.map(m => ({
      modelId:         m.modelId,
      displayName:     m.displayName,
      provider:        m.provider,
      providerColor:   m.providerColor,
      contextWindow:   m.contextWindow,
      maxOutputTokens: m.maxOutputTokens,
      badge:           m.badge,
      isActive:        m.isActive,
      sortOrder:       m.sortOrder,
      _input:  Number(m.inputPriceUsdMtok),
      _output: Number(m.outputPriceUsdMtok),
      _badge:  m.badge ?? '',
      _active: m.isActive,
    }))
    const s = settingsRes.data.data.settings
    exchangeRate.value = s.exchangeRateUsdSgd
    markupPct.value    = s.platformMarkupPct
  } catch {
    ElMessage.error(t('toast.adminPricingLoadFailed'))
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await HttpClient.post(ApiRoute.MARKETPLACE.ADMIN_SETTINGS, {
      exchangeRateUsdSgd: exchangeRate.value,
      platformMarkupPct:  markupPct.value,
    })
    ElMessage.success(t('toast.adminPricingSettingsSaved'))
  } catch {
    ElMessage.error(t('toast.adminPricingSettingsFailed'))
  } finally {
    savingSettings.value = false
  }
}

async function saveRow(row: AdminRow) {
  saving.value = row.modelId
  try {
    await HttpClient.post(ApiRoute.MARKETPLACE.ADMIN_MODEL(row.modelId), {
      inputPriceUsdMtok:  row._input,
      outputPriceUsdMtok: row._output,
      isActive:           row._active,
      badge:              row._badge || null,
    })
    row.isActive = row._active
    row.badge    = row._badge || null
    ElMessage.success(t('toast.adminPricingModelUpdated', { name: row.displayName }))
  } catch {
    ElMessage.error(t('toast.adminPricingModelFailed'))
  } finally {
    saving.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="pricing-page">

    <header class="pricing-header">
      <el-button text size="small" class="back-btn" @click="router.push('/admin')">
        ← Admin
      </el-button>
      <h2 class="pricing-title">Marketplace Pricing</h2>
    </header>

    <div class="pricing-body" v-loading="loading">

      <!-- ── Global settings ──────────────────────────────── -->
      <div class="settings-card">
        <div class="settings-title">Global Billing Settings</div>
        <p class="settings-desc">
          These values apply to all models. Billing rate = provider USD price ÷ 1000 × exchange rate × (1 + markup%).
        </p>
        <div class="settings-row">
          <div class="settings-field">
            <label class="field-label">USD → SGD Exchange Rate</label>
            <el-input-number
              v-model="exchangeRate"
              :min="0.1"
              :precision="4"
              :step="0.01"
              size="small"
              controls-position="right"
              style="width: 140px"
            />
          </div>
          <div class="settings-field">
            <label class="field-label">Platform Markup %</label>
            <el-input-number
              v-model="markupPct"
              :min="0"
              :max="1000"
              :precision="1"
              :step="5"
              size="small"
              controls-position="right"
              style="width: 120px"
            />
          </div>
          <el-button
            type="primary"
            size="small"
            :loading="savingSettings"
            @click="saveSettings"
          >
            Save Settings
          </el-button>
        </div>
      </div>

      <!-- ── Model rows ────────────────────────────────────── -->
      <div class="model-rows">
        <div v-for="row in rows" :key="row.modelId" class="model-row">

          <!-- Identity + active toggle -->
          <div class="row-identity">
            <span class="row-dot" :style="{ background: row.providerColor }" />
            <div class="row-names">
              <span class="row-name">{{ row.displayName }}</span>
              <code class="row-model-id">{{ row.modelId }}</code>
            </div>
            <el-switch
              v-model="row._active"
              active-text="Active"
              inactive-text="Hidden"
              size="small"
              class="row-switch"
            />
          </div>

          <!-- Price inputs -->
          <div class="row-prices">
            <div class="price-field">
              <label class="field-label">Input USD/MTok</label>
              <el-input-number
                v-model="row._input"
                :min="0"
                :precision="4"
                :step="0.1"
                size="small"
                controls-position="right"
                style="width: 140px"
              />
              <span class="price-calc">→ {{ calcPreview(row._input) }} input</span>
            </div>
            <div class="price-field">
              <label class="field-label">Output USD/MTok</label>
              <el-input-number
                v-model="row._output"
                :min="0"
                :precision="4"
                :step="0.1"
                size="small"
                controls-position="right"
                style="width: 140px"
              />
              <span class="price-calc">→ {{ calcPreview(row._output) }} output</span>
            </div>
            <div class="price-field">
              <label class="field-label">Badge</label>
              <el-select v-model="row._badge" size="small" clearable placeholder="None" style="width: 130px">
                <el-option label="Popular"    value="Popular" />
                <el-option label="Best Value" value="Best Value" />
                <el-option label="Fastest"    value="Fastest" />
                <el-option label="New"        value="New" />
              </el-select>
            </div>
          </div>

          <!-- Save -->
          <div class="row-actions">
            <el-button
              type="primary"
              size="small"
              :loading="saving === row.modelId"
              @click="saveRow(row)"
            >
              Save
            </el-button>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.pricing-page {
  width: 100%;
  min-height: calc(100vh - 80px);
  background: var(--color-background);
  overflow-y: auto;
}

.pricing-header {
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

.pricing-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
}

.pricing-body {
  max-width: 860px;
  margin: 0 auto;
  padding: 28px 24px 64px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Global settings ─────────────────────────────────────── */
.settings-card {
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: 14px;
  background: color-mix(in srgb, var(--el-color-primary) 4%, var(--color-background-soft));
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-title {
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  opacity: 0.8;
}

.settings-desc {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.55;
  margin: 0;
  line-height: 1.5;
}

.settings-row {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
}

.settings-field,
.price-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.45;
}

/* ── Model rows ──────────────────────────────────────────── */
.model-rows {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.model-row {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-background-soft);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.row-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.row-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.row-names {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.row-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--color-heading);
}

.row-model-id {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.68rem;
  color: var(--color-text);
  opacity: 0.35;
}

.row-switch { flex-shrink: 0; }

.row-prices {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.price-calc {
  font-size: 0.7rem;
  color: var(--el-color-primary);
  opacity: 0.8;
  font-weight: 600;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 640px) {
  .pricing-header { padding: 0 16px; }
  .pricing-body   { padding: 20px 16px 48px; }
  .row-prices, .settings-row { flex-direction: column; gap: 12px; }
}
</style>
