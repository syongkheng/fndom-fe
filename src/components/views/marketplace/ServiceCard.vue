<script setup lang="ts">
import type { LLMModel } from '@/interfaces/Marketplace.model'

defineProps<{
  service: LLMModel
  isSelected: boolean
}>()

const emit = defineEmits<{
  select: [service: LLMModel]
}>()
</script>

<template>
  <div
    class="service-row"
    :class="{ 'service-row--selected': isSelected }"
    @click="emit('select', service)"
  >
    <div class="row-body">
      <div class="row-title">{{ service.name }}</div>
      <div class="row-sub">{{ service.provider }}</div>
    </div>
    <span class="row-cost">{{ service.inputPrice }} / MTok</span>
  </div>
</template>

<style scoped>
.service-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;
  user-select: none;
}

.service-row:hover {
  background: var(--color-background-mute);
}

.service-row--selected {
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}

.service-row--selected .row-title {
  color: var(--el-color-primary);
}

.row-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
  line-height: 1;
}

.row-body {
  flex: 1;
  min-width: 0;
}

.row-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.12s;
}

.row-sub {
  font-size: 0.68rem;
  color: var(--color-text);
  opacity: 0.4;
  margin-top: 1px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.row-cost {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-text);
  opacity: 0.45;
  white-space: nowrap;
}

.row-cost--free {
  color: var(--el-color-success);
  opacity: 0.8;
  font-weight: 600;
}
</style>
