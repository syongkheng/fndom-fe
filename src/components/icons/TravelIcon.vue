<script setup lang="ts">
defineProps<{ svg: string }>()
</script>

<template>
  <span class="travel-icon" v-html="svg" />
</template>

<style scoped>
.travel-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  line-height: 0;
  flex-shrink: 0;
}

.travel-icon :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
