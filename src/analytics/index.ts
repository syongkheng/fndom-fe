import { StorageUtils } from '@/utilities/StorageUtils'
import { Breakpoint } from '@/constants/Breakpoint'
import { ApiRoute } from '@/constants/ApiRoute'

const BASE_URL = (import.meta.env.VITE_SERVER_BASE_URL as string | undefined) ?? 'http://localhost:3000'
const ENDPOINT = `${BASE_URL}${ApiRoute.ANALYTICS.COLLECT}`
const SYSTEM = 'fndom'

type ScreenSize = 'small' | 'medium' | 'large'

/** Analytics ingest contract v1 — see qindom src/analytics/AnalyticsContract.ts. */
export interface AnalyticsEvent {
  v: 1
  system: string
  event: string
  sessionId: string
  timestamp: number
  page: string
  referrer: string
  screen: { width: number; height: number; breakpoint: string; size: ScreenSize }
  properties: Record<string, unknown>
}

/** Mirrors useBreakpointManager's currentBreakpoint, plus the normalised size class. */
function currentScreen(): AnalyticsEvent['screen'] {
  const width = window.innerWidth
  const height = window.innerHeight
  if (width <= Breakpoint.S) return { width, height, breakpoint: 'S', size: 'small' }
  if (width <= Breakpoint.M) return { width, height, breakpoint: 'M', size: 'medium' }
  if (width <= Breakpoint.CALENDAR) return { width, height, breakpoint: 'CALENDAR', size: 'large' }
  return { width, height, breakpoint: 'L', size: 'large' }
}

export function track(event: string, properties: Record<string, unknown> = {}): void {
  const payload: AnalyticsEvent = {
    v: 1,
    system: SYSTEM,
    event,
    sessionId: StorageUtils.getVisitorSessionId(),
    timestamp: Date.now(),
    page: window.location.pathname,
    referrer: document.referrer,
    screen: currentScreen(),
    properties,
  }

  if (import.meta.env.DEV) {
    console.debug('%c[analytics]', 'color:#42b983;font-weight:bold', event, properties)
  }

  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Analytics must never break the user experience
  })
}
