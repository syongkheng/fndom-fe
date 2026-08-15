<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { CopyDocument } from '@element-plus/icons-vue'
import { useIotDeviceStore, type IotApiKeyStatus } from '@/stores/iotDevice'

const store = useIotDeviceStore()
const { t } = useI18n()

const serverBaseUrl = import.meta.env.VITE_SERVER_BASE_URL as string

const statusLoading = ref(false)
const apiKeyStatus = ref<IotApiKeyStatus>({ hasKey: false, name: null, createdDt: null, keyHint: null })
const deviceName = ref('')
const keyGenerating = ref(false)
const keyRevoking = ref(false)
const freshlyGeneratedKey = ref('')

async function refreshApiKeyStatus() {
  statusLoading.value = true
  try {
    apiKeyStatus.value = await store.fetchApiKeyStatus()
  } catch {
    apiKeyStatus.value = { hasKey: false, name: null, createdDt: null, keyHint: null }
  } finally {
    statusLoading.value = false
  }
}

async function copyAndDismiss() {
  await navigator.clipboard.writeText(freshlyGeneratedKey.value)
  ElMessage.success(t('toast.iotKeyCopied'))
  freshlyGeneratedKey.value = ''
}

function dismissGeneratedKey() {
  freshlyGeneratedKey.value = ''
}

async function handleGenerateKey() {
  if (!deviceName.value.trim()) {
    ElMessage.warning(t('toast.iotKeyDeviceNameRequired'))
    return
  }
  keyGenerating.value = true
  try {
    const key = await store.generateApiKey(deviceName.value.trim())
    freshlyGeneratedKey.value = key
    await refreshApiKeyStatus()
    ElMessage({ type: 'warning', message: t('toast.iotKeyWarning'), duration: 6000 })
  } catch {
    ElMessage.error(t('toast.iotKeyFailed'))
  } finally {
    keyGenerating.value = false
  }
}

async function handleRegenerateKey() {
  try {
    await ElMessageBox.confirm(
      t('iot.key.regenerateConfirmMessage'),
      t('iot.key.regenerateConfirmTitle'),
      { confirmButtonText: t('iot.key.regenerate'), cancelButtonText: t('iot.key.cancel'), type: 'warning' },
    )
    await handleGenerateKey()
  } catch {
    // ElMessageBox cancel throws — ignore
  }
}

async function handleRevokeKey() {
  try {
    await ElMessageBox.confirm(
      t('iot.key.revokeConfirmMessage'),
      t('iot.key.revokeConfirmTitle'),
      { confirmButtonText: t('iot.key.revoke'), cancelButtonText: t('iot.key.cancel'), type: 'error' },
    )
    keyRevoking.value = true
    await store.revokeApiKey()
    freshlyGeneratedKey.value = ''
    deviceName.value = ''
    apiKeyStatus.value = { hasKey: false, name: null, createdDt: null, keyHint: null }
    ElMessage.success(t('toast.iotKeyRevoked'))
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
  <div class="iot-root">
    <div class="iot-heading">
      <h1 class="iot-title">{{ t('iot.key.title') }}</h1>
      <p class="iot-subtitle">{{ t('iot.key.subtitle') }}</p>
    </div>

    <div class="section-card" v-loading="statusLoading">
      <div class="key-card-header">
        <span class="key-card-title">{{ t('iot.key.cardTitle') }}</span>
        <el-tag v-if="apiKeyStatus.hasKey" type="success" size="small" effect="plain">{{ t('iot.key.statusActive') }}</el-tag>
        <el-tag v-else type="info" size="small" effect="plain">{{ t('iot.key.statusNotConfigured') }}</el-tag>
      </div>

      <template v-if="apiKeyStatus.hasKey">
        <!-- One-time reveal — only shown immediately after generation -->
        <div v-if="freshlyGeneratedKey" class="fresh-key-banner">
          <div class="fresh-key-warning">{{ t('iot.key.freshWarning') }}</div>
          <div class="key-reveal-row">
            <el-input :model-value="freshlyGeneratedKey" readonly class="key-input" />
            <el-button type="primary" :icon="CopyDocument" @click="copyAndDismiss">{{ t('iot.key.copy') }}</el-button>
          </div>
          <el-button text size="small" type="info" style="margin-top: 6px;" @click="dismissGeneratedKey">
            {{ t('iot.key.dismiss') }}
          </el-button>
        </div>

        <p class="key-desc">
          {{ apiKeyStatus.name }} · {{ t('iot.key.createdOn', { date: apiKeyStatus.createdDt ? formatDate(apiKeyStatus.createdDt) : '' }) }}
        </p>

        <div class="key-field-label">{{ t('iot.key.keyHintLabel') }}</div>
        <div class="key-hint-display">iot_{{ apiKeyStatus.keyHint ?? '?????' }}…</div>

        <div class="key-actions" style="margin-top: 16px;">
          <el-button size="small" :loading="keyGenerating" @click="handleRegenerateKey">{{ t('iot.key.regenerate') }}</el-button>
          <el-button size="small" type="danger" plain :loading="keyRevoking" @click="handleRevokeKey">{{ t('iot.key.revoke') }}</el-button>
        </div>
      </template>

      <template v-else>
        <p class="key-desc">{{ t('iot.key.noKeyDesc') }}</p>
        <el-form label-position="top" class="generate-form">
          <el-form-item :label="t('iot.key.deviceNameLabel')">
            <el-input v-model="deviceName" :placeholder="t('iot.key.deviceNamePlaceholder')" />
          </el-form-item>
          <el-button type="primary" :loading="keyGenerating" @click="handleGenerateKey">{{ t('iot.key.generate') }}</el-button>
        </el-form>
      </template>
    </div>

    <div class="usage-guide">
      <div class="usage-guide-title">{{ t('iot.key.usageTitle') }}</div>
      <ol class="usage-steps">
        <li>{{ t('iot.key.usageStep1') }}</li>
        <li>{{ t('iot.key.usageStep2') }}</li>
      </ol>

      <div class="usage-endpoints">
        <div class="endpoint-title">{{ t('iot.key.usageEndpointsTitle') }}</div>

        <div class="endpoint-row">
          <span class="endpoint-method">POST</span>
          <code class="endpoint-path">{{ serverBaseUrl }}/iot</code>
        </div>
        <div class="endpoint-body">
          {{ t('iot.key.usagePostBodyLabel') }}
          <code>{{ '{ "deviceId": "hike-hitcher-01", "deviceName": "optional label" }' }}</code>
        </div>

        <div class="endpoint-row" style="margin-top: 10px;">
          <span class="endpoint-method">GET</span>
          <code class="endpoint-path">{{ serverBaseUrl }}/iot</code>
        </div>
        <div class="endpoint-body">
          {{ t('iot.key.usageGetQueryLabel') }}
          <code>?deviceId=hike-hitcher-01</code>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.iot-root {
  max-width: 640px;
  width: 100%;
  justify-self: center;
  padding-bottom: 48px;
}

.iot-heading {
  padding: 24px 0 20px;
}

.iot-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 4px;
}

.iot-subtitle {
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

.generate-form {
  max-width: 360px;
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
