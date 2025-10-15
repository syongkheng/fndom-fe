// src/constants/breakpoints.ts
export const Breakpoint = {
  S: 425, // Small (0-425px)
  M: 800, // Medium (426-800px)
  L: 801, // Large (801+ px)
  CALENDAR: 1200, // Calendar specific breakpoint
} as const

export type BreakpointType = keyof typeof Breakpoint
