<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/common/AppIcon.vue'
import { useCameraStore } from '@/stores/camera'
import type { CameraDevice, CameraQuality } from '@/interfaces/Camera.model'

const props = defineProps<{ device: CameraDevice }>()
const emit = defineEmits<{ remove: [deviceId: string] }>()

const { t } = useI18n()
const store = useCameraStore()

const STALE_AFTER_MS = 3000

const canvas = ref<HTMLCanvasElement | null>(null)
const confirmOpen = ref(false)

const confirmRemove = () => {
  confirmOpen.value = false
  emit('remove', props.device.deviceId)
}
const hasFrame = ref(false)
const stale = ref(false)
const now = ref(Date.now())

const state = computed(() => store.live[props.device.deviceId])
const online = computed(() => state.value?.online ?? false)
const status = computed(() => state.value?.status ?? null)
const recording = computed(() => online.value && (status.value?.recording ?? false))

// Draw the newest JPEG; while one is decoding, newer frames replace the waiting one.
let decoding = false
let waiting: Blob | null = null

async function draw(blob: Blob) {
  if (decoding) {
    waiting = blob
    return
  }
  decoding = true
  try {
    const bitmap = await createImageBitmap(blob)
    const el = canvas.value
    if (el) {
      if (el.width !== bitmap.width || el.height !== bitmap.height) {
        el.width = bitmap.width
        el.height = bitmap.height
      }
      el.getContext('2d')?.drawImage(bitmap, 0, 0)
      hasFrame.value = true
      stale.value = false
    }
    bitmap.close()
  } catch {
    // Corrupt frame: skip it.
  } finally {
    decoding = false
    const next = waiting
    waiting = null
    if (next) void draw(next)
  }
}

let unsubscribe: (() => void) | undefined
let ticker: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  unsubscribe = store.onFrame(props.device.deviceId, (blob) => void draw(blob))
  ticker = setInterval(() => {
    now.value = Date.now()
    const age = store.frameAge(props.device.deviceId)
    stale.value = age == null || age > STALE_AFTER_MS
  }, 500)
})

onBeforeUnmount(() => {
  unsubscribe?.()
  clearInterval(ticker)
})

const elapsedText = computed(() => {
  const s = status.value
  if (!recording.value || !s) return ''
  const ms = s.elapsedMs + (now.value - (state.value?.statusAt ?? now.value))
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
})

const batteryText = computed(() => {
  const level = status.value?.batteryLevel
  if (level == null) return '—'
  return `${Math.round(level * 100)}%${status.value?.charging ? ' ⚡' : ''}`
})

const storageText = computed(() => {
  const bytes = status.value?.freeBytes
  if (bytes == null) return '—'
  return `${(bytes / 1e9).toFixed(1)} GB`
})

const thermalText = computed(() =>
  status.value ? t(`camera.thermal.${status.value.thermalState}`) : '—',
)
const thermalWarn = computed(
  () => status.value?.thermalState === 'serious' || status.value?.thermalState === 'critical',
)

const quality = computed<CameraQuality>(() => status.value?.quality ?? '4k')

const overlay = computed(() => {
  if (!online.value) return t('camera.offline')
  if (!hasFrame.value) return t('camera.waitingForPreview')
  if (stale.value) return t('camera.stale')
  return ''
})

const setQuality = (value: CameraQuality) =>
  store.sendCommand('set_quality', props.device.deviceId, value)
const toggleRecording = () =>
  store.sendCommand(recording.value ? 'stop' : 'start', props.device.deviceId)
</script>

<template>
  <article class="cam-tile bp-panel" :class="{ recording, offline: !online }">
    <div class="cam-preview">
      <canvas ref="canvas" class="cam-canvas" :class="{ dimmed: overlay }" />
      <div v-if="overlay" class="cam-overlay">{{ overlay }}</div>
      <div v-if="recording" class="cam-rec">● {{ t('camera.rec') }} {{ elapsedText }}</div>
    </div>

    <header class="cam-head">
      <span
        class="cam-dot"
        :class="{ on: online }"
        :title="online ? t('camera.online') : t('camera.offline')"
      />
      <h2 class="cam-name">{{ device.name }}</h2>
      <span class="cam-state">{{ online ? t('camera.online') : t('camera.offline') }}</span>
    </header>

    <dl class="cam-stats">
      <div>
        <dt>{{ t('camera.battery') }}</dt>
        <dd>{{ batteryText }}</dd>
      </div>
      <div>
        <dt>{{ t('camera.storage') }}</dt>
        <dd>{{ storageText }}</dd>
      </div>
      <div>
        <dt>{{ t('camera.thermalLabel') }}</dt>
        <dd :class="{ warn: thermalWarn }">{{ thermalText }}</dd>
      </div>
      <div>
        <dt>{{ t('camera.preview') }}</dt>
        <dd>{{ status ? `${status.previewFps} fps` : '—' }}</dd>
      </div>
      <div v-if="status && status.droppedFrames > 0">
        <dt>{{ t('camera.dropped') }}</dt>
        <dd class="warn">{{ status.droppedFrames }}</dd>
      </div>
      <div v-if="status && recording && !status.hasAudio">
        <dt>{{ t('camera.audio') }}</dt>
        <dd class="warn">{{ t('camera.noAudio') }}</dd>
      </div>
    </dl>

    <div class="cam-controls">
      <el-select
        :model-value="quality"
        size="default"
        class="cam-quality"
        :disabled="!online || recording"
        :aria-label="t('camera.quality')"
        @update:model-value="setQuality"
      >
        <el-option value="4k" :label="t('camera.quality4k')" />
        <el-option value="1080p" :label="t('camera.quality1080')" />
      </el-select>
      <el-button
        :type="recording ? 'default' : 'danger'"
        :disabled="!online"
        round
        @click="toggleRecording"
      >
        {{ recording ? t('camera.stop') : t('camera.start') }}
      </el-button>
      <el-popover
        v-model:visible="confirmOpen"
        trigger="click"
        placement="top"
        :width="288"
        popper-class="cam-confirm-popper"
      >
        <template #reference>
          <el-button text type="danger">{{ t('camera.remove') }}</el-button>
        </template>
        <div
          class="cam-confirm"
          role="alertdialog"
          :aria-label="t('camera.removeTitle', { name: device.name })"
        >
          <div class="cam-confirm-head">
            <span class="cam-confirm-icon"><AppIcon name="trash" size="18px" /></span>
            <div>
              <p class="cam-confirm-title">{{ t('camera.removeTitle', { name: device.name }) }}</p>
              <p class="cam-confirm-desc">{{ t('camera.removeDesc') }}</p>
            </div>
          </div>
          <div class="cam-confirm-actions">
            <el-button round @click="confirmOpen = false">{{ t('camera.cancel') }}</el-button>
            <el-button type="danger" round @click="confirmRemove">{{
              t('camera.remove')
            }}</el-button>
          </div>
        </div>
      </el-popover>
    </div>
  </article>
</template>

<style scoped>
.cam-tile {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  min-width: 0;
}

.cam-tile.recording {
  box-shadow: 0 0 0 2px var(--color-danger);
}

.cam-preview {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.cam-canvas {
  max-width: 100%;
  max-height: 100%;
  transition: opacity 0.2s;
}

.cam-canvas.dimmed {
  opacity: 0.35;
}

.cam-overlay {
  position: absolute;
  inset: auto 12px 12px 12px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 0.85rem;
  text-align: center;
}

.cam-rec {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--color-danger);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.cam-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.cam-dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-text-tertiary);
}

.cam-dot.on {
  background: var(--color-success);
}

.cam-name {
  margin: 0;
  font-size: 1.05rem;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cam-state {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
}

.cam-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 8px;
  margin: 0;
}

.cam-stats dt {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}

.cam-stats dd {
  margin: 2px 0 0;
  font-size: 0.95rem;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.cam-stats dd.warn {
  color: var(--color-danger);
  font-weight: 700;
}

.cam-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.cam-quality {
  width: 140px;
}

.cam-confirm {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cam-confirm-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.cam-confirm-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 12%, transparent);
}

.cam-confirm-title {
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  overflow-wrap: anywhere;
}

.cam-confirm-desc {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--color-text-tertiary);
}

.cam-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cam-confirm-actions .el-button + .el-button {
  margin-left: 0;
}
</style>

<style>
/* The popover is teleported to <body>, so its frame can't be styled from the scoped block. */
.el-popover.el-popper.cam-confirm-popper {
  padding: 16px;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-pop);
}
</style>
