<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediaItem {
  id: string
  fileType: string
  fileName: string | null
  fileSize: number | null
  createdAt: number
  expiresAt: number | null
}

// ─── State ────────────────────────────────────────────────────────────────────

const linked = ref<boolean | null>(null)   // null = loading
const telegramHandle = ref<string | null>(null)

const linkToken = ref<string | null>(null)
const tokenExpiry = ref<number | null>(null)
const tokenLoading = ref(false)
const howItWorksOpen = ref(false)

const mediaList = ref<MediaItem[]>([])
const mediaLoading = ref(false)

interface RetrieveResult {
  id: string
  fileType: string
  fileName: string | null
  fileSize: number | null
  createdAt: number
  expiresAt: number | null
}

const retrieveId = ref('')
const retrieveResult = ref<RetrieveResult | null>(null)
const retrieveLoading = ref(false)

const expiryInputs = ref<Record<string, string>>({})
const savingExpiry = ref<Record<string, boolean>>({})
const deletingId = ref<string | null>(null)

const uploadFile = ref<File | null>(null)
const uploadPreviewUrl = ref<string | null>(null)
const uploadLoading = ref(false)
const uploadProgress = ref(0)
const isDragging = ref(false)

const previewUrls = ref<Record<string, string>>({})

const currentPage = ref(1)
const pageSize = 12

// ─── Computed ─────────────────────────────────────────────────────────────────

const pagedMedia = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return mediaList.value.slice(start, start + pageSize)
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FILE_TYPE_META: Record<string, { icon: string; color: string }> = {
  photo: { icon: '🖼', color: '#3b82f6' },
  video: { icon: '🎬', color: '#8b5cf6' },
  document: { icon: '📄', color: '#f59e0b' },
  audio: { icon: '🎵', color: '#10b981' },
  voice: { icon: '🎤', color: '#06b6d4' },
  animation: { icon: '🎞', color: '#ec4899' },
}

function fileMeta(t: string) {
  return FILE_TYPE_META[t] ?? { icon: '📁', color: '#6b7280' }
}

function fileTypeLabel(t: string): string {
  return { photo: 'Photo', video: 'Video', document: 'File', audio: 'Audio', voice: 'Voice', animation: 'GIF' }[t] ?? t
}

function formatDate(ts: number | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function expiryStatus(item: MediaItem): { label: string; type: 'success' | 'warning' | 'danger' | 'info' } {
  if (!item.expiresAt) return { label: 'Forever', type: 'info' }
  const diff = item.expiresAt - Date.now()
  if (diff < 0) return { label: 'Expired', type: 'danger' }
  if (diff < 7 * 86400000) return { label: `Expires ${formatDate(item.expiresAt)}`, type: 'warning' }
  return { label: `Expires ${formatDate(item.expiresAt)}`, type: 'success' }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  ElMessage.success(`Copied: ${text}`)
}

function setUploadFile(file: File) {
  uploadFile.value = file
  if (uploadPreviewUrl.value) URL.revokeObjectURL(uploadPreviewUrl.value)
  uploadPreviewUrl.value = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) setUploadFile(file)
  else uploadFile.value = null
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) setUploadFile(file)
}

function clearUpload() {
  uploadFile.value = null
  uploadProgress.value = 0
  if (uploadPreviewUrl.value) URL.revokeObjectURL(uploadPreviewUrl.value)
  uploadPreviewUrl.value = null
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif', 'bmp'])

function isImageItem(item: MediaItem): boolean {
  if (item.fileType === 'photo') return true
  const ext = item.fileName?.split('.').pop()?.toLowerCase()
  return ext ? IMAGE_EXTENSIONS.has(ext) : false
}

async function fetchPreview(item: MediaItem) {
  if (!isImageItem(item) || previewUrls.value[item.id]) return
  try {
    const r = await HttpClient.get(ApiRoute.TELEGRAM.MEDIA_PREVIEW(item.id), { responseType: 'blob' })
    previewUrls.value[item.id] = URL.createObjectURL(r.data)
  } catch {
    // preview is non-critical — fail silently
  }
}

function fetchPreviewsForPage() {
  pagedMedia.value.forEach(item => fetchPreview(item))
}

// ─── Actions ──────────────────────────────────────────────────────────────────

async function loadLinkStatus() {
  try {
    const res = await HttpClient.get(ApiRoute.TELEGRAM.LINK_STATUS)
    linked.value = res.data.data.linked
    telegramHandle.value = res.data.data.telegramUsername
    if (!linked.value) howItWorksOpen.value = true
  } catch {
    linked.value = false
    howItWorksOpen.value = true
  }
}

async function generateToken() {
  tokenLoading.value = true
  try {
    const res = await HttpClient.post(ApiRoute.TELEGRAM.LINK_TOKEN, {})
    linkToken.value = res.data.data.token
    tokenExpiry.value = Date.now() + res.data.data.expiresInSeconds * 1000
  } catch {
    ElMessage.error('Failed to generate token')
  } finally {
    tokenLoading.value = false
  }
}

async function uploadMedia() {
  if (!uploadFile.value) return
  uploadLoading.value = true
  uploadProgress.value = 0
  try {
    const form = new FormData()
    form.append('file', uploadFile.value)
    await HttpClient.post(ApiRoute.TELEGRAM.MEDIA_UPLOAD, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        uploadProgress.value = e.total ? Math.round((e.loaded / e.total) * 100) : 0
      },
    })
    ElMessage.success('Uploaded — file sent to your Telegram DM')
    clearUpload()
    await loadMedia()
  } catch (err: any) {
    const status = err?.response?.data?.status
    if (status === 'InvalidRequestException') {
      ElMessage.error('Open a private chat with the bot and send /start first, then retry.')
    } else if (status === 'ForbiddenAccessException') {
      ElMessage.error('Link your Telegram account first.')
    } else {
      ElMessage.error('Upload failed')
    }
  } finally {
    uploadLoading.value = false
  }
}

async function loadMedia() {
  mediaLoading.value = true
  try {
    Object.values(previewUrls.value).forEach(URL.revokeObjectURL)
    previewUrls.value = {}
    const res = await HttpClient.get(ApiRoute.TELEGRAM.MEDIA_LIST)
    mediaList.value = res.data.data
    expiryInputs.value = {}
    currentPage.value = 1
    fetchPreviewsForPage()
  } catch {
    ElMessage.error('Failed to load media')
  } finally {
    mediaLoading.value = false
  }
}

watch(currentPage, fetchPreviewsForPage)

async function retrieve() {
  const id = retrieveId.value.trim()
  if (!id) return
  retrieveLoading.value = true
  retrieveResult.value = null
  try {
    const res = await HttpClient.get(ApiRoute.TELEGRAM.MEDIA_BY_ID(id))
    const meta = res.data.data
    retrieveResult.value = {
      id,
      fileType: meta.fileType,
      fileName: meta.fileName,
      fileSize: meta.fileSize,
      createdAt: meta.createdAt,
      expiresAt: meta.expiresAt,
    }
  } catch {
    ElMessage.error('File not found or access denied')
  } finally {
    retrieveLoading.value = false
  }
}

async function downloadMedia(id: string) {
  try {
    const r = await HttpClient.get(ApiRoute.TELEGRAM.MEDIA_DOWNLOAD(id), { responseType: 'blob' })
    const cd: string = r.headers['content-disposition'] ?? ''
    const match = cd.match(/filename="?([^"]+)"?/)
    const filename = match?.[1] ?? id
    const url = URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('Failed to download')
  }
}

async function saveExpiry(item: MediaItem) {
  const raw = expiryInputs.value[item.id]
  const days = parseInt(raw ?? '')
  if (isNaN(days) || days < 0) {
    ElMessage.warning('Enter a valid number of days (0 = never)')
    return
  }
  savingExpiry.value[item.id] = true
  try {
    await HttpClient.post(ApiRoute.TELEGRAM.MEDIA_EXPIRE(item.id), { days })
    item.expiresAt = days === 0 ? null : Date.now() + days * 86400000
    expiryInputs.value[item.id] = ''
    ElMessage.success('Expiry updated')
  } catch {
    ElMessage.error('Failed to update expiry')
  } finally {
    savingExpiry.value[item.id] = false
  }
}

async function deleteMedia(item: MediaItem) {
  try {
    await ElMessageBox.confirm(
      `Delete file ${item.id}? This cannot be undone.`,
      'Confirm Delete',
      { confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'warning' }
    )
  } catch {
    return
  }
  deletingId.value = item.id
  try {
    await HttpClient.post(ApiRoute.TELEGRAM.MEDIA_DELETE(item.id), {})
    mediaList.value = mediaList.value.filter(m => m.id !== item.id)
    ElMessage.success(`Deleted ${item.id}`)
  } catch {
    ElMessage.error('Failed to delete')
  } finally {
    deletingId.value = null
  }
}

onMounted(async () => {
  await loadLinkStatus()
  await loadMedia()
})
</script>

<template>
  <div class="page-container tg-page">

    <!-- Header + Quick Retrieve -->
    <section class="tg-header">
      <div class="tg-header-left">
        <h1 class="tg-title">Telegram Storage</h1>

        <!-- Link status pill -->
        <div v-if="linked === null" class="status-pill status-pill--loading">Checking…</div>
        <div v-else-if="linked" class="status-pill status-pill--linked">
          🔗 Linked{{ telegramHandle ? ` as @${telegramHandle}` : '' }}
        </div>
        <div v-else class="status-pill status-pill--unlinked" @click="howItWorksOpen = true">
          ⚠ Not linked — click to set up
        </div>
      </div>

      <!-- Quick retrieve -->
      <div class="retrieve-bar">
        <el-input v-model="retrieveId" placeholder="Paste a file ID…" clearable @keyup.enter="retrieve"
          class="retrieve-input">
          <template #prefix><span style="opacity:0.4">⌕</span></template>
        </el-input>
        <el-button type="primary" :loading="retrieveLoading" @click="retrieve">Get</el-button>
      </div>

      <div v-if="retrieveResult" class="retrieve-card">
        <div class="rr-accent" :style="{ background: fileMeta(retrieveResult.fileType).color }"></div>
        <div class="rr-content">
          <div class="rr-top">
            <span class="rr-icon">{{ fileMeta(retrieveResult.fileType).icon }}</span>
            <span class="rr-type">{{ fileTypeLabel(retrieveResult.fileType) }}</span>
            <code class="rr-id">{{ retrieveResult.id }}</code>
            <el-tag :type="expiryStatus(retrieveResult).type" size="small" class="rr-expiry">{{
              expiryStatus(retrieveResult).label }}</el-tag>
          </div>
          <div class="rr-meta">
            <span v-if="retrieveResult.fileName" class="rr-filename">{{ retrieveResult.fileName }}</span>
            <span v-if="formatSize(retrieveResult.fileSize)">{{ formatSize(retrieveResult.fileSize) }}</span>
            <span>Uploaded {{ formatDate(retrieveResult.createdAt) }}</span>
          </div>
          <el-button type="primary" size="small" @click="downloadMedia(retrieveResult!.id)">Download</el-button>
        </div>
      </div>
    </section>

    <!-- Upload -->
    <section class="upload-section">
      <div class="files-header" style="margin-bottom:12px">
        <div class="files-title">Direct Upload</div>
      </div>

      <div class="drop-zone" :class="{ 'drop-zone--active': isDragging, 'drop-zone--filled': uploadFile }"
        @dragover.prevent="isDragging = true" @dragleave="isDragging = false" @drop.prevent="onDrop"
        @click="($refs.fileInput as HTMLInputElement).click()">
        <input ref="fileInput" type="file" class="file-input-hidden" @change="onFileChange" />

        <template v-if="!uploadFile">
          <span class="drop-icon">☁</span>
          <span class="drop-label">Drop a file here or click to browse</span>
          <span class="drop-hint">Images, videos, documents — up to 50 MB · No compression</span>
        </template>

        <template v-else>
          <img v-if="uploadPreviewUrl" :src="uploadPreviewUrl" class="upload-preview-img"
            @error="uploadPreviewUrl = null" />
          <span v-if="!uploadPreviewUrl" class="drop-icon">📄</span>
          <span class="drop-label">{{ uploadFile.name }}</span>
          <span class="drop-hint">{{ formatSize(uploadFile.size) }}</span>
        </template>
      </div>

      <div v-if="uploadFile" class="upload-actions">
        <el-progress v-if="uploadLoading" :percentage="uploadProgress" :stroke-width="6" class="upload-progress" />
        <el-button type="primary" :loading="uploadLoading" @click="uploadMedia">
          Upload
        </el-button>
        <el-button text @click="clearUpload" :disabled="uploadLoading">Clear</el-button>
      </div>
    </section>

    <!-- How it works (collapsible) -->
    <div class="how-it-works">
      <button class="hiw-toggle" @click="howItWorksOpen = !howItWorksOpen">
        <span>How it works</span>
        <span class="hiw-chevron" :class="{ open: howItWorksOpen }">›</span>
      </button>

      <div v-if="howItWorksOpen" class="hiw-steps">
        <div class="hiw-step">
          <div class="hiw-num">1</div>
          <div class="hiw-body">
            <div class="hiw-title">Link your account</div>
            <div class="hiw-desc">Generate a one-time token, then send it to the bot.</div>
            <div class="hiw-action">
              <el-button type="primary" size="small" :loading="tokenLoading" @click="generateToken">
                Generate Token
              </el-button>
              <div v-if="linkToken" class="token-chip">
                <span class="token-val">{{ linkToken }}</span>
                <el-button text size="small" @click="copyToClipboard(linkToken!)">Copy</el-button>
              </div>
            </div>
            <div v-if="linkToken" class="hiw-hint">
              Send to bot: <code>/link {{ linkToken }}</code>
              <span class="hint-expiry">· expires {{ formatDate(tokenExpiry) }}</span>
            </div>
          </div>
        </div>

        <div class="hiw-step">
          <div class="hiw-num">2</div>
          <div class="hiw-body">
            <div class="hiw-title">Upload media</div>
            <div class="hiw-desc">
              Send any photo, video, document, audio or voice to the bot.
              The message is deleted and you get a short ID back — plus tap-to-retrieve buttons.
            </div>
          </div>
        </div>

        <div class="hiw-step">
          <div class="hiw-num">3</div>
          <div class="hiw-body">
            <div class="hiw-title">Retrieve</div>
            <div class="hiw-desc">
              Tap <strong>📥 Retrieve</strong> on the bot message, use <code>/list</code> to browse with buttons,
              or paste the ID in the search bar above.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- My Files -->
    <section class="tg-files">
      <div class="files-header">
        <div class="files-title">My Files <span v-if="mediaList.length" class="files-count">{{ mediaList.length
            }}</span>
        </div>
        <el-button size="small" text :loading="mediaLoading" @click="loadMedia">Refresh</el-button>
      </div>

      <div v-if="mediaLoading" class="tg-empty">Loading…</div>
      <div v-else-if="mediaList.length === 0" class="tg-empty">No files stored yet. Upload something via the bot.</div>

      <div v-else>
        <div class="media-grid">
          <div v-for="item in pagedMedia" :key="item.id" class="media-card">

            <!-- Card top strip -->
            <div class="card-strip" :style="{ background: fileMeta(item.fileType).color }">
              <span class="card-icon">{{ fileMeta(item.fileType).icon }}</span>
              <span class="card-type">{{ fileTypeLabel(item.fileType) }}</span>
              <el-tag :type="expiryStatus(item).type" size="small" class="card-expiry-tag">{{ expiryStatus(item).label
                }}</el-tag>
            </div>

            <!-- Photo preview thumbnail -->
            <div v-if="previewUrls[item.id]" class="card-preview">
              <img :src="previewUrls[item.id]" class="card-preview-img" @error="delete previewUrls[item.id]" />
            </div>

            <!-- Card body -->
            <div class="card-body">
              <div class="card-id-row">
                <span class="card-id">{{ item.id }}</span>
                <button class="card-copy" @click="copyToClipboard(item.id)" title="Copy ID">⎘</button>
              </div>

              <div class="card-meta">
                <span v-if="item.fileName" class="card-filename">{{ item.fileName }}</span>
                <span class="card-date">{{ formatDate(item.createdAt) }}</span>
                <span v-if="formatSize(item.fileSize)" class="card-size">{{ formatSize(item.fileSize) }}</span>
              </div>

              <!-- Set expiry inline -->
              <div class="card-expiry-row">
                <el-input v-model="expiryInputs[item.id]" placeholder="days (0=never)" size="small" class="expiry-input"
                  @keyup.enter="saveExpiry(item)" />
                <el-button size="small" text :loading="savingExpiry[item.id]" @click="saveExpiry(item)">Set</el-button>
              </div>

              <!-- Actions -->
              <div class="card-actions">
                <el-button size="small" type="primary" plain @click="downloadMedia(item.id)">
                  Download
                </el-button>
                <el-button size="small" type="danger" text :loading="deletingId === item.id" @click="deleteMedia(item)">
                  Delete
                </el-button>
              </div>
            </div>

          </div>
        </div>

        <div class="pagination-row" v-if="mediaList.length > pageSize">
          <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="mediaList.length"
            layout="prev, pager, next" small />
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.tg-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 1.5rem 64px;
}

/* ── Header ── */
.tg-header {
  margin-bottom: 20px;
}

.tg-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tg-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

/* Status pill */
.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
}

.status-pill--loading {
  background: var(--color-background-soft);
  color: var(--color-text);
  opacity: 0.5;
}

.status-pill--linked {
  background: color-mix(in srgb, var(--el-color-success) 12%, transparent);
  color: var(--el-color-success);
  border: 1px solid color-mix(in srgb, var(--el-color-success) 25%, transparent);
}

.status-pill--unlinked {
  background: color-mix(in srgb, var(--el-color-warning) 12%, transparent);
  color: var(--el-color-warning);
  border: 1px solid color-mix(in srgb, var(--el-color-warning) 25%, transparent);
  cursor: pointer;
}

/* Quick retrieve */
.retrieve-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  max-width: 380px;
}

.retrieve-input {
  flex: 1;
}

.retrieve-card {
  display: flex;
  margin-top: 12px;
  max-width: 480px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-background);
}

.rr-accent {
  width: 5px;
  flex-shrink: 0;
}

.rr-content {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.rr-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rr-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.rr-type {
  font-weight: 700;
  font-size: 0.88rem;
}

.rr-id {
  font-family: monospace;
  font-size: 0.88rem;
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
  padding: 1px 6px;
  border-radius: 4px;
}

.rr-expiry {
  flex-shrink: 0;
}

.rr-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 0.78rem;
  opacity: 0.55;
}

.rr-filename {
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── How it works ── */
.how-it-works {
  margin-bottom: 28px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
}

.hiw-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 16px;
  background: var(--color-background-soft);
  border: none;
  cursor: pointer;
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.7;
  text-align: left;
}

.hiw-toggle:hover {
  opacity: 1;
}

.hiw-chevron {
  font-size: 1.1rem;
  transition: transform 0.2s;
  display: inline-block;
  transform: rotate(0deg);
}

.hiw-chevron.open {
  transform: rotate(90deg);
}

.hiw-steps {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hiw-step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.hiw-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  color: var(--el-color-primary);
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.hiw-body {
  flex: 1;
}

.hiw-title {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 3px;
}

.hiw-desc {
  font-size: 0.82rem;
  opacity: 0.6;
  line-height: 1.5;
  margin-bottom: 8px;
}

.hiw-action {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.token-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 3px 8px;
}

.token-val {
  font-family: monospace;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--el-color-primary);
}

.hiw-hint {
  margin-top: 6px;
  font-size: 0.8rem;
  opacity: 0.55;
}

.hiw-hint code {
  background: var(--color-background-soft);
  border-radius: 3px;
  padding: 1px 5px;
  font-family: monospace;
}

.hint-expiry {
  opacity: 0.7;
}

/* ── Files ── */

.files-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.files-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.45;
  display: flex;
  align-items: center;
  gap: 6px;
}

.files-count {
  background: var(--color-background-soft);
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 0.7rem;
  opacity: 0.8;
}

.tg-empty {
  font-size: 0.88rem;
  opacity: 0.4;
  padding: 24px 0;
}

/* ── Card grid ── */
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.media-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-background);
  transition: box-shadow 0.15s;
}

.media-card:hover {
  box-shadow: 0 2px 12px color-mix(in srgb, currentColor 6%, transparent);
}

.card-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  opacity: 0.88;
}

.card-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.card-type {
  font-size: 0.78rem;
  font-weight: 700;
  color: #fff;
  flex: 1;
  letter-spacing: 0.03em;
}

.card-expiry-tag {
  flex-shrink: 0;
}

.card-body {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-id-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-id {
  font-family: monospace;
  font-size: 1rem;
  font-weight: 700;
  color: var(--el-color-primary);
  letter-spacing: 0.06em;
}

.card-copy {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  opacity: 0.35;
  padding: 0 2px;
  transition: opacity 0.1s;
  color: var(--color-text);
}

.card-copy:hover {
  opacity: 0.9;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
  font-size: 0.77rem;
  opacity: 0.55;
  line-height: 1.3;
}

.card-filename {
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-expiry-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.expiry-input {
  flex: 1;
  max-width: 150px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 2px;
}

/* Pagination */
.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

/* ── Upload ── */
.upload-section {
  margin-bottom: 28px;
}

.drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  text-align: center;
  user-select: none;
}

.drop-zone:hover,
.drop-zone--active {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 4%, transparent);
}

.drop-zone--filled {
  border-style: solid;
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 6%, transparent);
}

.file-input-hidden {
  display: none;
}

.drop-icon {
  font-size: 2rem;
  line-height: 1;
  opacity: 0.5;
}

.drop-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.drop-hint {
  font-size: 0.78rem;
  opacity: 0.45;
}

.upload-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.upload-progress {
  flex: 1;
  min-width: 120px;
}

/* Upload preview */
.upload-preview-img {
  max-height: 180px;
  max-width: 100%;
  object-fit: contain;
  border-radius: 6px;
  margin-bottom: 6px;
}

/* Card photo thumbnail */
.card-preview {
  width: 100%;
  overflow: hidden;
  max-height: 160px;
}

.card-preview-img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  display: block;
}

/* Mobile */
@media (max-width: 480px) {
  .media-grid {
    grid-template-columns: 1fr;
  }

  .retrieve-bar {
    max-width: 100%;
  }
}
</style>
