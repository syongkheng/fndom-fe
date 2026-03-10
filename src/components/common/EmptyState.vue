<script lang="ts" setup>
defineProps<{
  icon: string
  title: string
  message?: string
}>()
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <div class="empty-title">{{ title }}</div>
    <p v-if="message" class="empty-desc">{{ message }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  text-align: center;
}

.empty-icon {
  font-size: 2.4rem;
}

.empty-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
}

.empty-desc {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.55;
  line-height: 1.5;
  margin: 0;
}
</style>
