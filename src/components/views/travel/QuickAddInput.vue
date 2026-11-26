<script lang="ts" setup>
import { ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'

// One-line "type and press Enter" input used at the foot of every planner
// list. Emits the trimmed text and clears itself; parents decide what to make.
const props = withDefaults(defineProps<{
  placeholder: string
  compact?: boolean
  autofocus?: boolean
  // Column width of whatever the parent creates from the text (see constants/TravelLimits).
  maxlength?: number
}>(), { compact: false, autofocus: false, maxlength: undefined })

const emit = defineEmits<{ (e: 'submit', text: string): void }>()

const text = ref('')
const inputRef = ref<{ focus: () => void } | null>(null)

const submit = () => {
  const value = text.value.trim()
  if (!value) return
  emit('submit', value)
  text.value = ''
  inputRef.value?.focus()
}

defineExpose({ focus: () => inputRef.value?.focus() })
</script>

<template>
  <div class="quick-add" :class="{ 'quick-add--compact': props.compact }">
    <el-input
      ref="inputRef"
      v-model="text"
      :placeholder="props.placeholder"
      :maxlength="props.maxlength"
      :autofocus="props.autofocus"
      :size="props.compact ? 'small' : 'default'"
      clearable
      @keydown.enter.prevent="submit"
    >
      <template #prefix>
        <el-icon class="quick-add-icon"><Plus /></el-icon>
      </template>
    </el-input>
    <transition name="fade">
      <el-button v-if="text.trim()" type="primary" :size="props.compact ? 'small' : 'default'" @click="submit">
        <el-icon><Plus /></el-icon>
      </el-button>
    </transition>
  </div>
</template>

<style scoped>
.quick-add {
  display: flex;
  gap: 6px;
  align-items: center;
}

.quick-add :deep(.el-input__wrapper) {
  box-shadow: none;
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  transition: border-color 0.12s, background 0.12s;
}

.quick-add :deep(.el-input__wrapper.is-focus) {
  border-style: solid;
  border-color: var(--el-color-primary);
  background: var(--color-background);
}

.quick-add-icon {
  opacity: 0.5;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
