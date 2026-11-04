<script setup lang="ts">
import { computed } from 'vue'

// Line icons (24px grid, currentColor) that stand in for emoji across the app.
// Add a new icon by adding a path string here — nothing else to register.
const PATHS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5',
  wallet: 'M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5ZM16 13.5h2',
  suitcase: 'M4 8h16v11H4zM9 8V5.5h6V8M4 13h16',
  card: 'M3 6.5h18v11H3zM3 10.5h18M6.5 15h3',
  dice: 'M4 4h16v16H4zM8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01',
  lantern: 'M12 2.5v3M9 5.5h6M7 10c0-2.5 2-4.5 5-4.5s5 2 5 4.5v4c0 2.5-2 4.5-5 4.5s-5-2-5-4.5zM12 5.5v13M12 18.5V21M10 21h4',
  pin: 'M12 21s6.5-5.7 6.5-11a6.5 6.5 0 0 0-13 0c0 5.3 6.5 11 6.5 11ZM12 7.9a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6Z',
  map: 'M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5L3.5 20zM9 4v13.5M15 6.5V20',
  building: 'M5 20V4.5h9V20M14 9h5v11M3 20h18M8 8.5h3M8 12h3M8 15.5h3',
  plane: 'M21 4 3 11l7 2.5L12.5 21l2.5-6.5L21 4ZM10 13.5 21 4',
  image: 'M4 5h16v14H4zM4 16l4.5-4.5L13 16l3-3 4 4M9 9.5h.01',
  shield: 'M12 3 5 6v5.5c0 4.3 3 7.8 7 9.5 4-1.7 7-5.2 7-9.5V6zM9 12l2.2 2.2L15.5 10',
  bus: 'M5 4h14v13H5zM5 11h14M8 17v2.5M16 17v2.5M8.5 14h.01M15.5 14h.01',
  settings: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 4.5v5M8 14.5v5',
  user: 'M12 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM5 20c.5-3.6 3.4-5.5 7-5.5s6.5 1.9 7 5.5',
  bot: 'M5 8.5h14v10H5zM12 8.5V5M12 4h.01M9 13h.01M15 13h.01M9.5 16h5M3 12.5v2M21 12.5v2',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.5 15.5 20 20',
  bell: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 21h4',
  target: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 12h.01',
  dumbbell: 'M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12',
  flame: 'M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4 .2 1.2.8 2 1.8 2.3C10.5 8.8 11 6 12 3Z',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z',
  medal: 'M12 10a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM8.5 11 6.5 3.5h4l1.5 4 1.5-4h4L15.5 11',
  bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6z',
  calendar: 'M4 6h16v14H4zM4 10.5h16M8 3.5v4M16 3.5v4',
  check: 'M5 12.5 10 17.5 19 7',
  clipboard: 'M6 5h12v16H6zM9 3h6v3H9zM9 11h6M9 15h6',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  trash: 'M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M9 6l6 6-6 6',
  warning: 'M12 4 21 19.5H3zM12 10v4.5M12 17h.01',
}

const props = withDefaults(defineProps<{ name: string; size?: string | number }>(), { size: '1em' })

const d = computed(() => PATHS[props.name])
const dim = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
</script>

<template>
  <svg
    v-if="d"
    class="app-icon"
    viewBox="0 0 24 24"
    :width="dim"
    :height="dim"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="d" />
  </svg>
</template>

<style scoped>
.app-icon {
  flex-shrink: 0;
  vertical-align: -0.15em;
}
</style>
