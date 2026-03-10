<script lang="ts" setup>
import { ref, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string[]
  error?: boolean
}>(), {
  error: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'complete': []
}>()

const cellRefs = ref<HTMLInputElement[]>([])

const focus = () => {
  nextTick(() => cellRefs.value[0]?.focus())
}

defineExpose({ focus })

const onInput = (event: Event, index: number) => {
  const el = event.target as HTMLInputElement
  const digit = el.value.replace(/\D/g, '').slice(-1)
  const updated = [...props.modelValue]
  updated[index] = digit
  emit('update:modelValue', updated)
  if (digit && index < 5) {
    nextTick(() => cellRefs.value[index + 1]?.focus())
  }
  if (updated.join('').length === 6) {
    emit('complete')
  }
}

const onKeydown = (event: KeyboardEvent, index: number) => {
  if (event.key === 'Backspace') {
    const updated = [...props.modelValue]
    if (updated[index]) {
      updated[index] = ''
      emit('update:modelValue', updated)
    } else if (index > 0) {
      updated[index - 1] = ''
      emit('update:modelValue', updated)
      cellRefs.value[index - 1]?.focus()
    }
  } else if (event.key === 'ArrowLeft' && index > 0) {
    cellRefs.value[index - 1]?.focus()
  } else if (event.key === 'ArrowRight' && index < 5) {
    cellRefs.value[index + 1]?.focus()
  }
}

const onPaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const text = event.clipboardData?.getData('text') ?? ''
  const digits = text.replace(/\D/g, '').slice(0, 6).split('')
  const updated = [...digits, '', '', '', '', '', ''].slice(0, 6)
  emit('update:modelValue', updated)
  nextTick(() => {
    cellRefs.value[Math.min(digits.length, 5)]?.focus()
    if (updated.join('').length === 6) emit('complete')
  })
}
</script>

<template>
  <div class="otp-row">
    <input
      v-for="i in 6"
      :key="i"
      ref="cellRefs"
      class="otp-cell"
      :class="{ 'otp-cell--error': error }"
      type="text"
      inputmode="numeric"
      maxlength="1"
      autocomplete="one-time-code"
      :value="modelValue[i - 1]"
      @input="onInput($event, i - 1)"
      @keydown="onKeydown($event, i - 1)"
      @paste="onPaste($event)"
      @focus="($event.target as HTMLInputElement).select()"
    />
  </div>
</template>

<style scoped>
.otp-row {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.otp-cell {
  width: 44px;
  height: 52px;
  text-align: center;
  font-size: 1.4rem;
  font-weight: 600;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background: var(--el-fill-color-blank);
  color: var(--color-text);
  outline: none;
  caret-color: transparent;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.otp-cell:focus {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary) 20%, transparent);
}

.otp-cell--error {
  border-color: var(--el-color-danger);
  animation: otp-shake 0.35s ease;
}

@keyframes otp-shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-4px); }
  60%       { transform: translateX(4px); }
  80%       { transform: translateX(-2px); }
}
</style>
