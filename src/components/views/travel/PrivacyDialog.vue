<script lang="ts" setup>
import { ref, computed, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import OtpInput from '@/components/common/OtpInput.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [code: string | undefined]
}>()

const challengeDigits = ref<string[]>(['', '', '', '', '', ''])
const challengeDraft = computed(() => challengeDigits.value.join(''))
const otpRef = ref<{ focus: () => void } | null>(null)

watch(() => props.modelValue, (val) => {
  if (val) nextTick(() => otpRef.value?.focus())
})

const clearChallenge = () => {
  challengeDigits.value = ['', '', '', '', '', '']
  nextTick(() => otpRef.value?.focus())
}

const saveChallenge = () => {
  const code = challengeDraft.value
  if (code && code.length !== 6) {
    ElMessage.warning('Access code must be exactly 6 digits.')
    return
  }
  emit('save', code || undefined)
  emit('update:modelValue', false)
}

const skipPrivacy = () => {
  emit('update:modelValue', false)
}

// Allow parent to pre-fill existing digits when opening
const setDigits = (digits: string[]) => {
  challengeDigits.value = digits
}

defineExpose({ setDigits })
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    title="Trip Privacy"
    width="360px"
    :close-on-click-modal="false"
    align-center
  >
    <div class="privacy-dialog-body">
      <div class="privacy-warning">
        <span class="privacy-icon">🌐</span>
        <p>This trip is <strong>public by default</strong> — anyone with the share link can view it.</p>
      </div>
      <p class="privacy-hint">
        You can set a 6-digit numeric access code. Viewers will need this code to see your itinerary.
      </p>
      <div class="privacy-input-wrap">
        <OtpInput ref="otpRef" v-model="challengeDigits" />
        <div class="privacy-input-hint">
          Leave blank to keep the trip public ·
          <button v-if="challengeDraft" class="otp-clear-btn" type="button" @click="clearChallenge">Clear</button>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="privacy-dialog-footer">
        <el-button @click="skipPrivacy">Skip for now</el-button>
        <el-button type="primary" @click="saveChallenge">
          {{ challengeDraft ? 'Set Access Code' : 'Keep Public' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.privacy-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.privacy-warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: color-mix(in srgb, var(--el-color-warning) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--el-color-warning) 30%, transparent);
  border-radius: 8px;
}

.privacy-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
  margin-top: 1px;
}

.privacy-warning p {
  font-size: 0.85rem;
  color: var(--color-text);
  line-height: 1.5;
  margin: 0;
}

.privacy-hint {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.7;
  line-height: 1.55;
  margin: 0;
}

.privacy-input-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.privacy-input-hint {
  font-size: 0.74rem;
  color: var(--color-text);
  opacity: 0.5;
  text-align: center;
}

.otp-clear-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--el-color-danger);
  font-size: 0.74rem;
  opacity: 0.8;
  text-decoration: underline;
}

.otp-clear-btn:hover {
  opacity: 1;
}

.privacy-dialog-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
