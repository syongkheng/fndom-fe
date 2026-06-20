<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useMarketplaceStore } from '@/stores/marketplace'

const router = useRouter()
const store  = useMarketplaceStore()

const revealed      = ref(false)
const rotateLoading = ref(false)

const maskedKey = computed(() => {
  const key = store.apiKey?.apiKey
  if (!key) return '—'
  return '•'.repeat(Math.max(0, key.length - 6)) + key.slice(-6)
})

const displayKey = computed(() =>
  revealed.value ? (store.apiKey?.apiKey ?? '—') : maskedKey.value,
)

async function copyKey() {
  const key = store.apiKey?.apiKey
  if (!key) return
  try {
    await navigator.clipboard.writeText(key)
    ElMessage.success('API key copied to clipboard.')
  } catch {
    ElMessage.error('Copy failed — please copy manually.')
  }
}

async function handleRotate() {
  try {
    await ElMessageBox.confirm(
      'Rotating your API key will immediately invalidate the current one. Any integrations using the old key will stop working.',
      'Rotate API Key',
      { confirmButtonText: 'Rotate', cancelButtonText: 'Cancel', type: 'warning' },
    )
    rotateLoading.value = true
    await store.rotateApiKey()
    revealed.value = false
    ElMessage.success('API key rotated. Save your new key.')
  } catch (err: unknown) {
    if (err !== 'cancel') ElMessage.error('Failed to rotate API key.')
  } finally {
    rotateLoading.value = false
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(() => {
  store.fetchApiKey()
})
</script>

<template>
  <div class="apikey-page">

    <!-- Header -->
    <header class="apikey-header">
      <el-button text size="small" class="back-btn" @click="router.push('/marketplace')">
        ← Marketplace
      </el-button>
      <h2 class="apikey-title">API Key</h2>
    </header>

    <div class="apikey-body">

      <!-- Key card -->
      <div class="key-card">
        <div class="key-card-header">
          <div>
            <div class="card-title">Your API Key</div>
            <div v-if="store.apiKey" class="card-sub">
              Created {{ formatDate(store.apiKey.createdAt) }}
            </div>
          </div>
          <div class="key-card-actions">
            <el-button size="small" text @click="revealed = !revealed">
              {{ revealed ? 'Hide' : 'Reveal' }}
            </el-button>
            <el-button size="small" @click="copyKey" :disabled="!store.apiKey">Copy</el-button>
          </div>
        </div>

        <div class="key-display" :class="{ 'key-display--revealed': revealed }">
          {{ displayKey }}
        </div>
      </div>

      <!-- Rotate card -->
      <div class="rotate-card">
        <div class="card-title">Rotate Key</div>
        <p class="rotate-desc">
          Generate a new API key. Your current key will be immediately invalidated.
        </p>
        <el-button
          type="danger"
          plain
          size="small"
          :loading="rotateLoading"
          @click="handleRotate"
        >
          Rotate API Key
        </el-button>
      </div>

      <!-- Usage card -->
      <div class="usage-card">
        <div class="card-title">How to use</div>
        <p class="usage-desc">Your API key authenticates requests to the Awense Marketplace. Keep it secret and rotate it immediately if compromised.</p>
        <p class="usage-note">External API access is coming soon.</p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.apikey-page {
  width: 100%;
  min-height: calc(100vh - 80px);
  background: var(--color-background);
  overflow-y: auto;
}

/* ── Header ──────────────────────────────────────────────── */
.apikey-header {
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

.apikey-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
}

/* ── Body ────────────────────────────────────────────────── */
.apikey-body {
  max-width: 620px;
  margin: 0 auto;
  padding: 32px 24px 64px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Shared card ─────────────────────────────────────────── */
.key-card,
.rotate-card,
.usage-card {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-background-soft);
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--color-text);
  opacity: 0.45;
}

.card-sub {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.3;
  margin-top: 2px;
}

/* ── Key card ────────────────────────────────────────────── */
.key-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.key-card-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.key-display {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.6;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 14px;
  word-break: break-all;
  letter-spacing: 0.04em;
  transition: opacity 0.2s;
  min-height: 42px;
}

.key-display--revealed {
  opacity: 1;
  color: var(--color-heading);
}

/* ── Rotate card ─────────────────────────────────────────── */
.rotate-desc {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.55;
  margin: 0;
  line-height: 1.6;
}

/* ── Usage card ──────────────────────────────────────────── */
.usage-desc {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.6;
  margin: 0;
  line-height: 1.6;
}

.usage-note {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.35;
  margin: 0;
  font-style: italic;
}

/* ── Mobile ──────────────────────────────────────────────── */
@media (max-width: 640px) {
  .apikey-header { padding: 0 16px; }
  .apikey-body   { padding: 20px 16px 48px; }
  .key-card-header { flex-direction: column; }
}
</style>
