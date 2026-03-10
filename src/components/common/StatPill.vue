<script lang="ts" setup>
defineProps<{
  label: string
  value: string | number
}>()
</script>

<template>
  <div class="stat-pill">
    <span class="stat-value">{{ value }}</span>
    <span class="stat-label">{{ label }}</span>
  </div>
</template>

<style scoped>
.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 44px;
}

.stat-value {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-heading);
  line-height: 1;
}

.stat-label {
  font-size: 0.68rem;
  color: var(--color-text);
  opacity: 0.55;
  white-space: nowrap;
}
</style>
