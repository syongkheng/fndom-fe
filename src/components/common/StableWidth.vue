<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

// Wraps an i18n-driven label so its box never resizes when the locale
// switches. Renders one hidden "ghost" copy of the label per configured
// locale (see src/i18n.ts) stacked on the same CSS Grid cell as the real
// visible text — the grid cell auto-sizes to the widest of them, so the
// box is always exactly as wide as the longer language needs, with the
// shorter language just leaving a bit of empty space rather than shrinking
// its container. No hardcoded pixel widths to keep in sync with copy.
const LOCALES = ['en', 'zh'] as const

const props = defineProps<{
  path: string
  values?: Record<string, unknown>
}>()

const { t } = useI18n()

const ghosts = computed(() => LOCALES.map((locale) => t(props.path, props.values ?? {}, { locale })))
const visible = computed(() => t(props.path, props.values ?? {}))
</script>

<template>
  <span class="stable-width">
    <span v-for="(text, i) in ghosts" :key="i" class="stable-width__ghost" aria-hidden="true">{{ text }}</span>
    <span class="stable-width__visible">{{ visible }}</span>
  </span>
</template>

<style scoped>
.stable-width {
  display: inline-grid;
  justify-items: center;
}

.stable-width > * {
  grid-area: 1 / 1;
  white-space: nowrap;
}

.stable-width__ghost {
  visibility: hidden;
}
</style>
