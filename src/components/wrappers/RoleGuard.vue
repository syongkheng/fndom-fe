<script setup lang="ts">
import { computed } from 'vue'
import { usePermission } from '@/composables/usePermission'

const props = defineProps<{
  module: string   // e.g. 'PPHS', 'TRAVEL', 'SYSTEM'
  minLevel: number // e.g. 3, 4, 5
}>()

const { hasModuleAccess } = usePermission()

const allowed = computed(() => hasModuleAccess(props.module, props.minLevel))
</script>

<template>
  <slot v-if="allowed"></slot>
</template>
