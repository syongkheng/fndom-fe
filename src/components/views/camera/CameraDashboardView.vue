<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import PageBackButton from '@/components/common/PageBackButton.vue'
import { useToast } from '@/composables/useToast'
import { useCameraStore } from '@/stores/camera'
import CameraDeviceTile from './CameraDeviceTile.vue'

const { t } = useI18n()
const toast = useToast()
const store = useCameraStore()
const { devices, live, loaded, connection, startOffsetMs, lastStart } = storeToRefs(store)

const code = ref('')
const name = ref('')
const adding = ref(false)

onMounted(() => {
  store.fetchDevices().catch(() => toast.error(t('camera.loadFailed')))
  store.connect()
})

onBeforeUnmount(() => store.disconnect())

const addPhone = async () => {
  const clean = code.value.replace(/\D/g, '')
  if (clean.length !== 6 || adding.value) return
  adding.value = true
  try {
    const device = await store.claim(clean, name.value.trim() || undefined)
    toast.success(t('camera.added', { name: device.name }))
    code.value = ''
    name.value = ''
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    toast.error(status === 429 ? t('camera.tooManyAttempts') : t('camera.badCode'))
  } finally {
    adding.value = false
  }
}

const removePhone = async (deviceId: string) => {
  try {
    await store.remove(deviceId)
  } catch {
    toast.error(t('camera.removeFailed'))
  }
}

const anyOnline = () => devices.value.some((d) => live.value[d.deviceId]?.online)

const startAll = () => {
  if (!store.sendCommand('start', 'all')) toast.error(t('camera.notConnected'))
}

const stopAll = () => {
  if (!store.sendCommand('stop', 'all')) toast.error(t('camera.notConnected'))
}
</script>

<template>
  <div class="page-container camera-page">
    <header class="camera-header">
      <PageBackButton />
      <div class="camera-heading">
        <p class="bp-label">{{ t('camera.eyebrow') }}</p>
        <h1 class="camera-title">{{ t('camera.title') }}</h1>
        <p class="camera-subtitle">{{ t('camera.subtitle') }}</p>
      </div>
      <span class="camera-conn" :class="connection">{{
        t(`camera.connection.${connection}`)
      }}</span>
    </header>

    <div class="camera-toolbar">
      <form class="camera-add" @submit.prevent="addPhone">
        <el-input
          v-model="code"
          class="camera-code"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="7"
          :placeholder="t('camera.codePlaceholder')"
          :aria-label="t('camera.codePlaceholder')"
        />
        <el-input
          v-model="name"
          class="camera-name"
          maxlength="60"
          :placeholder="t('camera.namePlaceholder')"
        />
        <el-button
          type="primary"
          native-type="submit"
          round
          :loading="adding"
          :disabled="code.replace(/\D/g, '').length !== 6"
        >
          {{ t('camera.addPhone') }}
        </el-button>
      </form>

      <div class="camera-all">
        <el-button
          type="danger"
          round
          :disabled="connection !== 'open' || !anyOnline()"
          @click="startAll"
        >
          {{ t('camera.startAll') }}
        </el-button>
        <el-button round :disabled="connection !== 'open' || !anyOnline()" @click="stopAll">
          {{ t('camera.stopAll') }}
        </el-button>
      </div>
    </div>

    <p v-if="lastStart && startOffsetMs != null" class="camera-offset">
      {{ t('camera.startOffset', { ms: Math.round(startOffsetMs) }) }}
    </p>
    <p v-else-if="lastStart && lastStart.targets.length > 1" class="camera-offset muted">
      {{ t('camera.waitingForAcks') }}
    </p>

    <el-skeleton v-if="!loaded" :rows="3" animated />

    <div v-else-if="!devices.length" class="camera-empty bp-panel">
      <p class="camera-empty-title">{{ t('camera.emptyTitle') }}</p>
      <p class="camera-empty-desc">{{ t('camera.emptyDesc') }}</p>
    </div>

    <div v-else class="camera-grid">
      <CameraDeviceTile
        v-for="device in devices"
        :key="device.deviceId"
        :device="device"
        @remove="removePhone"
      />
    </div>
  </div>
</template>

<style scoped>
.camera-page {
  max-width: 1400px;
  margin: 0 auto;
}

.camera-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.camera-heading {
  flex: 1;
  min-width: 0;
}

.camera-title {
  margin: 8px 0 2px;
  font-size: 1.6rem;
  color: var(--color-heading);
}

.camera-subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
}

.camera-conn {
  flex-shrink: 0;
  margin-top: 8px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  background: var(--color-background-soft);
  color: var(--color-text-tertiary);
}

.camera-conn.open {
  color: var(--color-success);
}

.camera-conn.closed {
  color: var(--color-danger);
}

.camera-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.camera-add,
.camera-all {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.camera-code {
  width: 130px;
}

.camera-name {
  width: 180px;
}

.camera-offset {
  margin: 0 0 12px;
  font-size: 0.9rem;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.camera-offset.muted {
  color: var(--color-text-tertiary);
}

/* Two tiles side by side on desktop; one column on phones. */
.camera-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 800px) {
  .camera-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .camera-code,
  .camera-name {
    width: 100%;
  }

  .camera-add {
    width: 100%;
  }
}

.camera-empty {
  padding: 32px 16px;
  text-align: center;
}

.camera-empty-title {
  margin: 0 0 4px;
  font-weight: 700;
  color: var(--color-heading);
}

.camera-empty-desc {
  margin: 0;
  color: var(--color-text-tertiary);
}
</style>
