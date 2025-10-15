// src/composables/useBreakpoints.ts
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Breakpoint } from '../constants/Breakpoint'

export function useBreakpointManager() {
  const width = ref(window.innerWidth)

  const isScreensizeBelow = (bp: number) => width.value < bp
  const isScreensizeAbove = (bp: number) => width.value >= bp

  const currentBreakpoint = computed(() => {
    if (width.value <= Breakpoint.S) return 'S'
    if (width.value <= Breakpoint.M) return 'M'
    if (width.value <= Breakpoint.CALENDAR) return 'CALENDAR'
    return 'L'
  })

  const updateWidth = () => {
    width.value = window.innerWidth
  }

  onMounted(() => window.addEventListener('resize', updateWidth))
  onUnmounted(() => window.removeEventListener('resize', updateWidth))

  return {
    width,
    Breakpoint,
    currentBreakpoint,
    isScreensizeBelow,
    isScreensizeAbove,
  }
}
