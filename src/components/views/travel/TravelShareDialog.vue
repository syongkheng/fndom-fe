<script lang="ts" setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Link, View } from '@element-plus/icons-vue'
import { useToast } from '@/composables/useToast'
import OtpInput from '@/components/common/OtpInput.vue'

// One sheet for everything about sharing a trip: the public link, a preview
// button, and the optional 6-digit access code. Replaces the old auto-opening
// PrivacyDialog plus the separate lock button.
const props = defineProps<{
  modelValue: boolean
  shortCode?: string
  challenge?: string
  isDraft?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:challenge': [code: string | undefined]
  'login': []
}>()

const { t } = useI18n()
const toast = useToast()

const shareUrl = computed(() => props.shortCode ? `${window.location.origin}/travel/v/${props.shortCode}` : '')

const codeEnabled = ref(false)
const digits = ref<string[]>(['', '', '', '', '', ''])
const otpRef = ref<{ focus: () => void } | null>(null)
const draftCode = computed(() => digits.value.join(''))
const codeChanged = computed(() => draftCode.value !== (props.challenge ?? ''))

const syncFromProps = () => {
  const existing = (props.challenge ?? '').slice(0, 6)
  codeEnabled.value = !!existing
  digits.value = [...existing.split(''), '', '', '', '', '', ''].slice(0, 6)
}

watch(() => props.modelValue, (open) => { if (open) syncFromProps() })
watch(() => props.challenge, syncFromProps)

const onToggleCode = (on: boolean) => {
  if (on) {
    nextTick(() => otpRef.value?.focus())
    return
  }
  digits.value = ['', '', '', '', '', '']
  if (props.challenge) {
    emit('update:challenge', undefined)
    toast.success(t('travel.planner.noAccessCodeSet'))
  }
}

const applyCode = () => {
  if (draftCode.value.length !== 6) {
    toast.warning(t('toast.travelInvalidCode'))
    return
  }
  emit('update:challenge', draftCode.value)
  toast.success(t('travel.planner.accessCodeApplied'))
}

const copyLink = async () => {
  if (!shareUrl.value) return
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    toast.success(t('travel.list.linkCopied'))
  } catch {
    toast.error(t('travel.share.copyFailed'))
  }
}

const preview = () => {
  if (!shareUrl.value) return
  window.open(shareUrl.value, '_blank', 'noopener')
}

const close = () => emit('update:modelValue', false)
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('travel.share.title')"
    width="420px"
    align-center
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <div class="share-body">

      <!-- Draft: nothing to share yet -->
      <div v-if="isDraft" class="share-draft">
        <p>{{ t('travel.share.draftHint') }}</p>
        <el-button type="primary" @click="emit('login')">{{ t('nav.login') }}</el-button>
      </div>

      <template v-else>
        <div class="share-section">
          <div class="share-label">{{ t('travel.share.linkLabel') }}</div>
          <div v-if="shareUrl" class="share-link-row">
            <el-input :model-value="shareUrl" readonly size="large" @focus="(e: FocusEvent) => (e.target as HTMLInputElement).select()" />
            <el-button type="primary" size="large" @click="copyLink">
              <el-icon><Link /></el-icon> {{ t('travel.share.copy') }}
            </el-button>
          </div>
          <p v-else class="share-hint">{{ t('travel.planner.saveFirst') }}</p>
          <el-button v-if="shareUrl" link type="primary" class="share-preview" @click="preview">
            <el-icon><View /></el-icon> {{ t('travel.share.preview') }}
          </el-button>
        </div>

        <div class="share-section">
          <div class="share-code-head">
            <div>
              <div class="share-label">{{ t('travel.share.codeLabel') }}</div>
              <p class="share-hint">{{ t('travel.share.codeHint') }}</p>
            </div>
            <el-switch v-model="codeEnabled" @change="(v: boolean) => onToggleCode(v)" />
          </div>
          <div v-if="codeEnabled" class="share-code-body">
            <OtpInput ref="otpRef" v-model="digits" />
            <el-button type="primary" size="small" :disabled="!codeChanged || draftCode.length !== 6" @click="applyCode">
              {{ t('travel.share.apply') }}
            </el-button>
          </div>
          <div class="share-status" :class="{ 'share-status--locked': !!challenge }">
            {{ challenge ? t('travel.share.codeOn') : t('travel.share.codeOff') }}
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <el-button @click="close">{{ t('travel.share.done') }}</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.share-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.share-draft {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.share-draft p,
.share-hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.7;
  line-height: 1.5;
}

.share-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.share-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text);
}

.share-link-row {
  display: flex;
  gap: 8px;
}

.share-link-row :deep(.el-input) {
  flex: 1;
  min-width: 0;
}

.share-preview {
  align-self: flex-start;
  padding: 0;
}

.share-code-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.share-code-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background-soft);
}

.share-status {
  font-size: 0.74rem;
  color: var(--color-text);
  opacity: 0.55;
}

.share-status--locked {
  color: var(--el-color-success);
  opacity: 1;
}
</style>
