import { StorageUtils } from '@/utilities/StorageUtils'

const BASE_URL = (import.meta.env.VITE_SERVER_BASE_URL as string | undefined) ?? 'http://localhost:3000'
const ENDPOINT = `${BASE_URL}/api/analytics`
const SYSTEM = 'fndom'

export interface AnalyticsEvent {
  event: string
  properties: Record<string, unknown>
  timestamp: string
  sessionId: string
  page: string
  referrer: string
  system: string
}

export function track(event: string, properties: Record<string, unknown> = {}): void {
  const payload: AnalyticsEvent = {
    event,
    properties,
    timestamp: new Date().toISOString(),
    sessionId: StorageUtils.getVisitorSessionId(),
    page: window.location.pathname,
    referrer: document.referrer,
    system: SYSTEM,
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
