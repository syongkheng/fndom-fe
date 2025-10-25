<script setup lang="ts">
import type { Component } from 'vue'

const props = defineProps<{
  icon: Component
  label?: string
  labelPosition?: 'bottom' | 'right'
  onClickHandler?: (event?: MouseEvent) => void
}>()

const handleClick = (event: MouseEvent) => {
  if (props.onClickHandler) {
    props.onClickHandler(event)
  } else {
    console.warn("Unhandled click event.")
  }
}
</script>

<template>
  <span class="icon-wrapper" :class="`label-${props.labelPosition ?? 'bottom'}`" @click="handleClick">
    <el-icon class="icon">
      <component :is="props.icon" />
    </el-icon>

    <span class="icon-label" v-if="props.label">{{ props.label }}</span>
  </span>
</template>

<style scoped>
.icon-wrapper {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--icon-text-color, #666);
  cursor: pointer;
  transition: color 0.2s ease;
  font-size: var(--icon-text-size, 0.85rem);
}

.icon-wrapper:hover .icon {
  color: #409eff;
  /* Element Plus primary blue */
}

.icon {
  font-size: 1.2rem;
}

/* Layout: label on bottom (default) */
.label-bottom {
  flex-direction: column;
  justify-content: center;
}

/* Layout: label on right */
.label-right {
  flex-direction: row;
  justify-content: flex-start;
}

.icon-label {
  font-size: 0.8rem;
}
</style>
