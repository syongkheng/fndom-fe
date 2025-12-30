import HttpClient from '@/interceptors/HttpClient'

// utils/heartbeat.ts
export function startHeartbeat(visitorId: string, interval = 30000) {
  const send = () => {
    HttpClient.post('/api/analytics/heartbeat', { sessionId: visitorId }).catch((error) => {
      console.error('Heartbeat error:', error)
    })
  }

  send() // initial heartbeat
  const timer = setInterval(send, interval)

  window.addEventListener('beforeunload', send)

  return () => {
    clearInterval(timer)
    window.removeEventListener('beforeunload', send)
  }
}
