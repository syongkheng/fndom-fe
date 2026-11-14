// Camera relay protocol types — see docs/camera-protocol.md (source of truth in qindom).

export type CameraQuality = '4k' | '1080p'
export type CameraThermalState = 'nominal' | 'fair' | 'serious' | 'critical'

export interface CameraDevice {
  deviceId: string
  name: string
  online: boolean
  pairedAt: number | null
  lastSeenAt: number | null
}

export interface CameraStatus {
  recording: boolean
  startedAtMs: number | null
  elapsedMs: number
  quality: CameraQuality
  batteryLevel: number | null
  charging: boolean
  freeBytes: number
  thermalState: CameraThermalState
  droppedFrames: number
  hasAudio: boolean
  previewFps: number
}

export type CameraCommandType = 'start' | 'stop' | 'set_quality'

export interface CameraAck {
  deviceId: string
  command: CameraCommandType
  requestId: string | null
  ok: boolean
  error: string | null
  startedAtMs: number | null
}

export type CameraServerMessage =
  | { type: 'device_online'; deviceId: string; name: string; status: CameraStatus | null }
  | { type: 'device_offline'; deviceId: string }
  | { type: 'device_removed'; deviceId: string }
  | { type: 'status'; deviceId: string; status: CameraStatus }
  | ({ type: 'ack' } & CameraAck)
  | { type: 'command_result'; requestId: string | null; sent: string[]; offline: string[] }
