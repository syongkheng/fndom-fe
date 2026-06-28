const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL as string
const ENDPOINT = `${BASE_URL}/api/analytics/heartbeat`

export function startHeartbeat(visitorId: string, interval = 30000) {
  const send = (keepalive = false) => {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: visitorId, system: 'fndom' }),
      keepalive,
    }).catch(() => {
      // Heartbeat must never break the user experience
    })
  }

  const onUnload = () => send(true)

  send()
  const timer = setInterval(() => send(), interval)
  window.addEventListener('beforeunload', onUnload)

  return () => {
    clearInterval(timer)
    window.removeEventListener('beforeunload', onUnload)
  }
}
