<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { CopyDocument } from '@element-plus/icons-vue'
import { useSsApiKeyStore } from '@/stores/ssApiKey'

const store = useSsApiKeyStore()
const { t } = useI18n()

const serverBaseUrl = import.meta.env.VITE_SERVER_BASE_URL as string

const statusLoading = ref(false)
const apiKeyStatus = ref<{ hasKey: boolean; createdDt: number | null; keyHint: string | null }>({ hasKey: false, createdDt: null, keyHint: null })
const keyGenerating = ref(false)
const keyRevoking = ref(false)
const freshlyGeneratedKey = ref('')

async function refreshApiKeyStatus() {
  statusLoading.value = true
  try {
    apiKeyStatus.value = await store.fetchApiKeyStatus()
  } catch {
    apiKeyStatus.value = { hasKey: false, createdDt: null, keyHint: null }
  } finally {
    statusLoading.value = false
  }
}

async function copyAndDismiss() {
  await navigator.clipboard.writeText(freshlyGeneratedKey.value)
  ElMessage.success(t('toast.ssKeyCopied'))
  freshlyGeneratedKey.value = ''
}

function dismissGeneratedKey() {
  freshlyGeneratedKey.value = ''
}

async function handleGenerateKey() {
  keyGenerating.value = true
  try {
    const key = await store.generateApiKey()
    freshlyGeneratedKey.value = key
    await refreshApiKeyStatus()
    ElMessage({ type: 'warning', message: t('toast.ssKeyWarning'), duration: 6000 })
  } catch {
    ElMessage.error(t('toast.ssKeyFailed'))
  } finally {
    keyGenerating.value = false
  }
}

async function handleRegenerateKey() {
  try {
    await ElMessageBox.confirm(
      t('ssKey.regenerateConfirmMessage'),
      t('ssKey.regenerateConfirmTitle'),
      { confirmButtonText: t('ssKey.regenerate'), cancelButtonText: t('ssKey.cancel'), type: 'warning' },
    )
    await handleGenerateKey()
  } catch {
    // ElMessageBox cancel throws — ignore
  }
}

async function handleRevokeKey() {
  try {
    await ElMessageBox.confirm(
      t('ssKey.revokeConfirmMessage'),
      t('ssKey.revokeConfirmTitle'),
      { confirmButtonText: t('ssKey.revoke'), cancelButtonText: t('ssKey.cancel'), type: 'error' },
    )
    keyRevoking.value = true
    await store.revokeApiKey()
    freshlyGeneratedKey.value = ''
    apiKeyStatus.value = { hasKey: false, createdDt: null, keyHint: null }
    ElMessage.success(t('toast.ssKeyRevoked'))
  } catch {
    // ElMessageBox cancel throws — ignore
  } finally {
    keyRevoking.value = false
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(refreshApiKeyStatus)
</script>

<template>
  <div class="ss-key-root">
    <div class="ss-key-heading">
      <h1 class="ss-key-title">{{ t('ssKey.title') }}</h1>
      <p class="ss-key-subtitle">{{ t('ssKey.subtitle') }}</p>
    </div>

    <div class="section-card" v-loading="statusLoading">
      <div class="key-card-header">
        <span class="key-card-title">{{ t('ssKey.cardTitle') }}</span>
        <el-tag v-if="apiKeyStatus.hasKey" type="success" size="small" effect="plain">{{ t('ssKey.statusActive') }}</el-tag>
        <el-tag v-else type="info" size="small" effect="plain">{{ t('ssKey.statusNotConfigured') }}</el-tag>
      </div>

      <template v-if="apiKeyStatus.hasKey">
        <!-- One-time reveal — only shown immediately after generation -->
        <div v-if="freshlyGeneratedKey" class="fresh-key-banner">
          <div class="fresh-key-warning">{{ t('ssKey.freshWarning') }}</div>
          <div class="key-reveal-row">
            <el-input :model-value="freshlyGeneratedKey" readonly class="key-input" />
            <el-button type="primary" :icon="CopyDocument" @click="copyAndDismiss">{{ t('ssKey.copy') }}</el-button>
          </div>
          <el-button text size="small" type="info" style="margin-top: 6px;" @click="dismissGeneratedKey">
            {{ t('ssKey.dismiss') }}
          </el-button>
        </div>

        <p class="key-desc">
          {{ t('ssKey.createdOn', { date: apiKeyStatus.createdDt ? formatDate(apiKeyStatus.createdDt) : '' }) }}
        </p>

        <div class="key-field-label">{{ t('ssKey.keyHintLabel') }}</div>
        <div class="key-hint-display">ss_{{ apiKeyStatus.keyHint ?? '?????' }}…</div>

        <div class="key-actions" style="margin-top: 16px;">
          <el-button size="small" :loading="keyGenerating" @click="handleRegenerateKey">{{ t('ssKey.regenerate') }}</el-button>
          <el-button size="small" type="danger" plain :loading="keyRevoking" @click="handleRevokeKey">{{ t('ssKey.revoke') }}</el-button>
        </div>
      </template>

      <template v-else>
        <p class="key-desc">{{ t('ssKey.noKeyDesc') }}</p>
        <el-button type="primary" :loading="keyGenerating" @click="handleGenerateKey">{{ t('ssKey.generate') }}</el-button>
      </template>
    </div>

    <div class="usage-guide">
      <div class="usage-guide-title">{{ t('ssKey.usageTitle') }}</div>
      <ol class="usage-steps">
        <li>{{ t('ssKey.usageStep1') }}</li>
        <li>{{ t('ssKey.usageStep2') }}</li>
        <li>{{ t('ssKey.usageStep3') }}</li>
        <li>{{ t('ssKey.usageStep4') }}</li>
      </ol>

      <div class="usage-endpoints">
        <div class="endpoint-title">{{ t('ssKey.usageEndpointsTitle') }}</div>

        <div class="endpoint-row">
          <span class="endpoint-method">POST</span>
          <code class="endpoint-path">{{ serverBaseUrl }}/v1/ss/ap/transaction</code>
        </div>
        <div class="endpoint-body">
          {{ t('ssKey.usageBodyLabel') }}
          <code>{{ '{ "amount": "12.50", "merchant": "Starbucks", "name": "..." }' }}</code>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ss-key-root {
  max-width: 640px;
  width: 100%;
  justify-self: center;
  padding-bottom: 48px;
}

.ss-key-heading {
  padding: 24px 0 20px;
}

.ss-key-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 4px;
}

.ss-key-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
  margin: 0;
}

.section-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
}

.key-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.key-card-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
}

.key-desc {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.6;
  margin: 0 0 12px;
  line-height: 1.5;
}

.key-actions {
  display: flex;
  gap: 8px;
}

.key-field-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
  margin-bottom: 6px;
}

.key-hint-display {
  font-family: monospace;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-heading);
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.fresh-key-banner {
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-5);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.fresh-key-warning {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--el-color-warning-dark-2);
  margin-bottom: 10px;
  line-height: 1.4;
}

.key-reveal-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.key-input {
  font-family: monospace;
  flex: 1;
}

.usage-guide {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 20px;
}

.usage-guide-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 12px;
}

.usage-steps {
  margin: 0 0 16px 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.usage-steps li {
  font-size: 0.83rem;
  color: var(--color-text);
  line-height: 1.5;
}

.usage-endpoints {
  border-top: 1px solid var(--color-border);
  padding-top: 14px;
}

.endpoint-title {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.45;
  margin-bottom: 8px;
}

.endpoint-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.endpoint-method {
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-radius: 4px;
  padding: 2px 6px;
  flex-shrink: 0;
}

.endpoint-path {
  font-size: 0.78rem;
  word-break: break-all;
}

.endpoint-body {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.6;
  margin-top: 4px;
  padding-left: 4px;
  word-break: break-all;
}
</style>
