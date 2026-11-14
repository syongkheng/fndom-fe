import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import type {
  CameraAck,
  CameraCommandType,
  CameraDevice,
  CameraQuality,
  CameraServerMessage,
  CameraStatus,
} from '@/interfaces/Camera.model'

export type CameraConnection = 'idle' | 'connecting' | 'open' | 'closed'

export interface CameraLive {
  online: boolean
  status: CameraStatus | null
  /** Local time the status arrived — elapsed time is extrapolated from it, not from the phone's clock. */
  statusAt: number
}

interface StartRound {
  requestId: string
  targets: string[]
  acks: Record<string, CameraAck>
}

type FrameListener = (jpeg: Blob) => void

const MAX_RETRY_MS = 30_000

function dashboardSocketUrl(): string {
  const base = new URL(import.meta.env.VITE_SERVER_BASE_URL, window.location.href)
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
  base.pathname = base.pathname.replace(/\/$/, '') + ApiRoute.CAMERA.WS_DASHBOARD
  return base.toString()
}

let requestCounter = 0
const nextRequestId = () => `r${Date.now().toString(36)}${(requestCounter++).toString(36)}`

export const useCameraStore = defineStore('camera', () => {
  const devices = ref<CameraDevice[]>([])
  const live = reactive<Record<string, CameraLive>>({})
  const loaded = ref(false)
  const connection = ref<CameraConnection>('idle')
  const lastStart = ref<StartRound | null>(null)

  // Frames bypass reactivity: tiles subscribe and draw straight to a canvas.
  const frameListeners = new Map<string, FrameListener>()
  const lastFrameAt = new Map<string, number>()

  let socket: WebSocket | null = null
  let wanted = false
  let retryMs = 1000
  let retryTimer: ReturnType<typeof setTimeout> | undefined

  const liveOf = (deviceId: string): CameraLive => {
    if (!live[deviceId]) live[deviceId] = { online: false, status: null, statusAt: 0 }
    return live[deviceId]
  }

  /** Spread between the earliest and latest capture start of the last "start" round. */
  const startOffsetMs = computed(() => {
    const round = lastStart.value
    if (!round) return null
    const starts = Object.values(round.acks)
      .filter((a) => a.ok && a.startedAtMs != null)
      .map((a) => a.startedAtMs as number)
    if (starts.length < 2) return null
    return Math.max(...starts) - Math.min(...starts)
  })

  // ─── REST ───

  async function fetchDevices() {
    const res = await HttpClient.get(ApiRoute.CAMERA.LIST)
    devices.value = res.data.data as CameraDevice[]
    for (const device of devices.value) liveOf(device.deviceId).online ||= device.online
    loaded.value = true
  }

  async function claim(code: string, name?: string): Promise<CameraDevice> {
    const res = await HttpClient.post(ApiRoute.CAMERA.CLAIM, { code, ...(name ? { name } : {}) })
    const device = res.data.data as CameraDevice
    if (!devices.value.some((d) => d.deviceId === device.deviceId)) devices.value.push(device)
    liveOf(device.deviceId).online ||= device.online
    return device
  }

  async function remove(deviceId: string) {
    await HttpClient.post(ApiRoute.CAMERA.REMOVE(deviceId), {})
    forget(deviceId)
  }

  function forget(deviceId: string) {
    devices.value = devices.value.filter((d) => d.deviceId !== deviceId)
    delete live[deviceId]
    lastFrameAt.delete(deviceId)
  }

  // ─── WebSocket ───

  function connect() {
    wanted = true
    if (!socket) open()
  }

  function disconnect() {
    wanted = false
    clearTimeout(retryTimer)
    socket?.close()
    socket = null
    connection.value = 'idle'
  }

  function open() {
    clearTimeout(retryTimer)
    connection.value = 'connecting'
    const ws = new WebSocket(dashboardSocketUrl())
    ws.binaryType = 'arraybuffer'
    socket = ws

    ws.onopen = () => {
      if (socket !== ws) return
      connection.value = 'open'
      retryMs = 1000
    }
    ws.onmessage = (event) => {
      if (socket !== ws) return
      if (typeof event.data === 'string') handleText(event.data)
      else handleFrame(event.data as ArrayBuffer)
    }
    ws.onclose = () => {
      if (socket !== ws) return
      socket = null
      connection.value = 'closed'
      // We no longer know who is online; the server re-announces on reconnect.
      for (const state of Object.values(live)) state.online = false
      if (!wanted) return
      retryTimer = setTimeout(open, retryMs * (0.8 + Math.random() * 0.4))
      retryMs = Math.min(retryMs * 2, MAX_RETRY_MS)
    }
  }

  function handleFrame(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer)
    const idLength = bytes[0]
    if (!idLength || bytes.length <= 1 + idLength) return
    const deviceId = new TextDecoder().decode(bytes.subarray(1, 1 + idLength))
    lastFrameAt.set(deviceId, Date.now())
    frameListeners.get(deviceId)?.(new Blob([bytes.subarray(1 + idLength)], { type: 'image/jpeg' }))
  }

  function handleText(text: string) {
    let message: CameraServerMessage
    try {
      message = JSON.parse(text)
    } catch {
      return
    }
    switch (message.type) {
      case 'device_online': {
        const state = liveOf(message.deviceId)
        state.online = true
        if (message.status) {
          state.status = message.status
          state.statusAt = Date.now()
        }
        const known = devices.value.find((d) => d.deviceId === message.deviceId)
        if (known) known.name = message.name
        else void fetchDevices().catch(() => {}) // paired from another tab
        break
      }
      case 'device_offline':
        liveOf(message.deviceId).online = false
        break
      case 'device_removed':
        forget(message.deviceId)
        break
      case 'status': {
        const state = liveOf(message.deviceId)
        state.status = message.status
        state.statusAt = Date.now()
        break
      }
      case 'ack': {
        const round = lastStart.value
        if (message.command === 'start' && round && message.requestId === round.requestId) {
          round.acks[message.deviceId] = message
        }
        break
      }
      default:
        break
    }
  }

  function sendCommand(type: CameraCommandType, target: string, quality?: CameraQuality): boolean {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false
    const requestId = nextRequestId()
    if (type === 'start') {
      const targets =
        target === 'all'
          ? devices.value.filter((d) => live[d.deviceId]?.online).map((d) => d.deviceId)
          : [target]
      lastStart.value = { requestId, targets, acks: {} }
    }
    socket.send(JSON.stringify({ type, target, requestId, ...(quality ? { quality } : {}) }))
    return true
  }

  function onFrame(deviceId: string, listener: FrameListener) {
    frameListeners.set(deviceId, listener)
    return () => {
      if (frameListeners.get(deviceId) === listener) frameListeners.delete(deviceId)
    }
  }

  const frameAge = (deviceId: string) => {
    const at = lastFrameAt.get(deviceId)
    return at == null ? null : Date.now() - at
  }

  function reset() {
    disconnect()
    devices.value = []
    for (const key of Object.keys(live)) delete live[key]
    lastFrameAt.clear()
    lastStart.value = null
    loaded.value = false
  }

  return {
    devices,
    live,
    loaded,
    connection,
    lastStart,
    startOffsetMs,
    fetchDevices,
    claim,
    remove,
    connect,
    disconnect,
    sendCommand,
    onFrame,
    frameAge,
    reset,
  }
})
