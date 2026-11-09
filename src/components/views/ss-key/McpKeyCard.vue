<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { CopyDocument } from '@element-plus/icons-vue'
import { useToast } from '@/composables/useToast'
import { useMcpApiKeyStore, type McpApiKeyStatus } from '@/stores/mcpApiKey'

const store = useMcpApiKeyStore()
const { t } = useI18n()
const toast = useToast()

const serverBaseUrl = import.meta.env.VITE_SERVER_BASE_URL as string

const empty: McpApiKeyStatus = { hasKey: false, createdDt: null, keyHint: null }
const status = ref<McpApiKeyStatus>({ ...empty })
const loading = ref(false)
const generating = ref(false)
const revoking = ref(false)
const freshKey = ref('')

const command = computed(
  () => `claude mcp add --transport http awense-house ${serverBaseUrl}/mcp --header "x-api-key: ${freshKey.value || 'mcp_YOUR_KEY'}"`,
)

async function refresh() {
  loading.value = true
  try {
    status.value = await store.fetchApiKeyStatus()
  } catch {
    status.value = { ...empty }
  } finally {
    loading.value = false
  }
}

async function generate() {
  generating.value = true
  try {
    freshKey.value = await store.generateApiKey()
    await refresh()
    toast.warning(t('toast.ssKeyWarning'), { duration: 6000 })
  } catch {
    toast.error(t('mcpKey.keyFailed'))
  } finally {
    generating.value = false
  }
}

async function regenerate() {
  try {
    await ElMessageBox.confirm(t('mcpKey.regenerateConfirmMessage'), t('ssKey.regenerateConfirmTitle'), {
      confirmButtonText: t('ssKey.regenerate'),
      cancelButtonText: t('ssKey.cancel'),
      type: 'warning',
    })
    await generate()
  } catch {
    // ElMessageBox cancel throws — ignore
  }
}

async function revoke() {
  try {
    await ElMessageBox.confirm(t('mcpKey.revokeConfirmMessage'), t('ssKey.revokeConfirmTitle'), {
      confirmButtonText: t('ssKey.revoke'),
      cancelButtonText: t('ssKey.cancel'),
      type: 'error',
    })
    revoking.value = true
    await store.revokeApiKey()
    freshKey.value = ''
    status.value = { ...empty }
    toast.success(t('mcpKey.keyRevoked'))
  } catch {
    // ElMessageBox cancel throws — ignore
  } finally {
    revoking.value = false
  }
}

async function copy(text: string) {
  await navigator.clipboard.writeText(text)
  toast.success(t('toast.ssKeyCopied'))
}

const formatDate = (ts: number) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

onMounted(refresh)
</script>

<template>
  <div class="mcp-card" v-loading="loading">
    <div class="head">
      <span class="title">{{ t('mcpKey.cardTitle') }}</span>
      <el-tag v-if="status.hasKey" type="success" size="small" effect="plain">{{ t('ssKey.statusActive') }}</el-tag>
      <el-tag v-else type="info" size="small" effect="plain">{{ t('ssKey.statusNotConfigured') }}</el-tag>
    </div>
    <p class="desc">{{ t('mcpKey.desc') }}</p>

    <template v-if="status.hasKey">
      <div v-if="freshKey" class="fresh">
        <div class="fresh-warning">{{ t('ssKey.freshWarning') }}</div>
        <div class="row">
          <el-input :model-value="freshKey" readonly class="mono" />
          <el-button type="primary" :icon="CopyDocument" @click="copy(freshKey)">{{ t('ssKey.copy') }}</el-button>
        </div>
        <el-button text size="small" type="info" @click="freshKey = ''">{{ t('ssKey.dismiss') }}</el-button>
      </div>

      <p class="desc">{{ t('ssKey.createdOn', { date: status.createdDt ? formatDate(status.createdDt) : '' }) }}</p>
      <div class="label">{{ t('ssKey.keyHintLabel') }}</div>
      <div class="hint">mcp_{{ status.keyHint ?? '?????' }}…</div>

      <div class="actions">
        <el-button size="small" :loading="generating" @click="regenerate">{{ t('ssKey.regenerate') }}</el-button>
        <el-button size="small" type="danger" plain :loading="revoking" @click="revoke">{{ t('ssKey.revoke') }}</el-button>
      </div>

      <div class="guide">
        <div class="label">{{ t('mcpKey.usageTitle') }}</div>
        <ol>
          <li>{{ t('mcpKey.usageStep1') }}</li>
          <li>{{ t('mcpKey.usageStep2') }}</li>
          <li>{{ t('mcpKey.usageStep3') }}</li>
        </ol>
        <div class="row">
          <code class="cmd">{{ command }}</code>
          <el-button size="small" :icon="CopyDocument" @click="copy(command)">{{ t('ssKey.copy') }}</el-button>
        </div>
      </div>
    </template>

    <template v-else>
      <p class="desc">{{ t('mcpKey.noKeyDesc') }}</p>
      <el-button type="primary" :loading="generating" @click="generate">{{ t('ssKey.generate') }}</el-button>
    </template>
  </div>
</template>

<style scoped>
.mcp-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
}
.head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
}
.desc {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.6;
  margin: 0 0 12px;
  line-height: 1.5;
}
.label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
  margin-bottom: 6px;
}
.hint {
  font-family: monospace;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 16px;
}
.actions {
  display: flex;
  gap: 8px;
}
.fresh {
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-5);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 16px;
}
.fresh-warning {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--el-color-warning-dark-2);
  margin-bottom: 10px;
  line-height: 1.4;
}
.row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.mono {
  font-family: monospace;
  flex: 1;
}
.guide {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}
.guide ol {
  margin: 0 0 12px;
  padding-left: 18px;
  font-size: 0.8rem;
  line-height: 1.6;
  color: var(--color-text);
}
.cmd {
  flex: 1;
  min-width: 0;
  font-size: 0.72rem;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--color-background-mute);
  overflow-wrap: anywhere;
}
</style>
