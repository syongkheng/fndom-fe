<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import HttpClient from '@/interceptors/HttpClient'

interface UploadedImage {
  shortCode: string
  fullUrl: string
  fileName: string
  localPreview: string
}

const cdnBase = import.meta.env.VITE_SERVER_BASE_URL as string

const dragging = ref(false)
const selectedFile = ref<File | null>(null)
const localPreview = ref<string | null>(null)
const uploading = ref(false)
const progress = ref(0)
const result = ref<UploadedImage | null>(null)
const history = ref<UploadedImage[]>([])
const embedExpanded = ref(false)

const fileInput = ref<HTMLInputElement | null>(null)

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragging.value = true
}

function onDragLeave() {
  dragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) pickFile(file)
}

function onFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) pickFile(file)
}

function pickFile(file: File) {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('Only image files are supported')
    return
  }
  selectedFile.value = file
  localPreview.value = URL.createObjectURL(file)
  result.value = null
  embedExpanded.value = false
}

function clearSelection() {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
  selectedFile.value = null
  localPreview.value = null
  result.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function upload() {
  if (!selectedFile.value) return
  uploading.value = true
  progress.value = 0
  try {
    const form = new FormData()
    form.append('file', selectedFile.value)
    const res = await HttpClient.post<{ code: number; data: { shortCode: string; url: string } }>(
      '/api/img/upload',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          progress.value = Math.round((e.loaded / (e.total ?? e.loaded)) * 100)
        },
      },
    )
    const { shortCode } = res.data.data
    const fullUrl = `${cdnBase}/api/img/${shortCode}`
    const uploaded: UploadedImage = {
      shortCode,
      fullUrl,
      fileName: selectedFile.value.name,
      localPreview: localPreview.value!,
    }
    result.value = uploaded
    history.value.unshift(uploaded)
    selectedFile.value = null
    localPreview.value = null
    if (fileInput.value) fileInput.value.value = ''
  } catch {
    ElMessage.error('Upload failed. Please try again.')
  } finally {
    uploading.value = false
  }
}

async function copyUrl(url: string) {
  await navigator.clipboard.writeText(url)
  ElMessage.success('URL copied!')
}

async function copyEmbed(url: string) {
  await navigator.clipboard.writeText(`<img src="${url}" alt="" />`)
  ElMessage.success('Embed snippet copied!')
}
</script>

<template>
  <div class="page-container imghost">
    <h2 class="page-title">Image CDN</h2>
    <p class="page-sub">Upload an image and get a shareable link backed by Telegram CDN.</p>

    <!-- Drop zone -->
    <div
      v-if="!selectedFile && !result"
      class="drop-zone"
      :class="{ 'drop-zone--active': dragging }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="fileInput?.click()"
    >
      <span class="drop-icon">🖼️</span>
      <p class="drop-hint">Drag & drop an image here, or click to select</p>
      <p class="drop-sub">PNG, JPG, GIF, WebP · Max 20 MB</p>
      <input ref="fileInput" type="file" accept="image/*" style="display: none" @change="onFileInput" />
    </div>

    <!-- File preview + upload -->
    <div v-if="selectedFile && !uploading" class="preview-card">
      <img :src="localPreview!" class="preview-thumb" alt="preview" />
      <div class="preview-meta">
        <span class="preview-name">{{ selectedFile.name }}</span>
        <span class="preview-size">{{ formatBytes(selectedFile.size) }}</span>
      </div>
      <div class="preview-actions">
        <el-button type="primary" @click="upload">Upload</el-button>
        <el-button type="button" @click="clearSelection">Cancel</el-button>
      </div>
    </div>

    <!-- Upload progress -->
    <div v-if="uploading" class="progress-wrap">
      <p class="progress-label">Uploading…</p>
      <el-progress :percentage="progress" :stroke-width="10" status="active" />
    </div>

    <!-- Result card -->
    <div v-if="result" class="result-card">
      <div class="result-preview-wrap">
        <img :src="result.fullUrl" class="result-thumb" alt="uploaded" />
      </div>
      <div class="result-body">
        <p class="result-name">{{ result.fileName }}</p>
        <div class="url-row">
          <el-input :model-value="result.fullUrl" readonly class="url-input" />
          <el-button type="primary" @click="copyUrl(result.fullUrl)">Copy URL</el-button>
        </div>
        <div class="embed-toggle" @click="embedExpanded = !embedExpanded">
          <span>{{ embedExpanded ? '▾' : '▸' }} &lt;img&gt; snippet</span>
        </div>
        <div v-if="embedExpanded" class="embed-block">
          <code class="embed-code">&lt;img src="{{ result.fullUrl }}" alt="" /&gt;</code>
          <el-button size="small" type="button" @click="copyEmbed(result.fullUrl)">Copy</el-button>
        </div>
        <el-button class="upload-another" type="button" @click="clearSelection(); result = null; fileInput?.click()">
          Upload another
        </el-button>
      </div>
    </div>

    <!-- Session history -->
    <div v-if="history.length > 0" class="history-section">
      <h3 class="history-title">This session</h3>
      <div class="history-grid">
        <div v-for="item in history" :key="item.shortCode" class="history-item">
          <img :src="item.fullUrl" class="history-thumb" alt="uploaded" />
          <p class="history-name">{{ item.fileName }}</p>
          <el-button size="small" type="button" @click="copyUrl(item.fullUrl)">Copy URL</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.imghost {
  max-width: 680px;
  padding: 1.5em 1em 3em;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 4px;
}

.page-sub {
  font-size: 0.875rem;
  color: var(--color-text);
  opacity: 0.65;
  margin-bottom: 24px;
}

/* Drop zone */
.drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: 14px;
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  background: var(--color-background-soft);
}

.drop-zone:hover,
.drop-zone--active {
  border-color: var(--el-color-primary);
  background: var(--color-background-mute);
}

.drop-icon {
  font-size: 2.4rem;
}

.drop-hint {
  margin-top: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-heading);
}

.drop-sub {
  margin-top: 6px;
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.55;
}

/* File preview before upload */
.preview-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background-soft);
  flex-wrap: wrap;
}

.preview-thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.preview-meta {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
  word-break: break-all;
}

.preview-size {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.6;
}

.preview-actions {
  display: flex;
  gap: 8px;
}

/* Progress */
.progress-wrap {
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background-soft);
}

.progress-label {
  font-size: 0.875rem;
  color: var(--color-text);
  margin-bottom: 10px;
}

/* Result card */
.result-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background-soft);
  overflow: hidden;
}

.result-preview-wrap {
  background: #000;
  text-align: center;
  max-height: 320px;
  overflow: hidden;
}

.result-thumb {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
}

.result-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-heading);
  word-break: break-all;
}

.url-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.url-input {
  flex: 1;
  font-size: 0.8rem;
}

.embed-toggle {
  font-size: 0.82rem;
  color: var(--el-color-primary);
  cursor: pointer;
  user-select: none;
}

.embed-block {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-background-mute);
  border-radius: 6px;
  padding: 8px 10px;
  overflow-x: auto;
}

.embed-code {
  flex: 1;
  font-size: 0.78rem;
  color: var(--color-text);
  white-space: nowrap;
}

.upload-another {
  align-self: flex-start;
}

/* History */
.history-section {
  margin-top: 32px;
}

.history-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 12px;
  opacity: 0.75;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
}

.history-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background-soft);
  align-items: center;
  text-align: center;
}

.history-thumb {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 6px;
}

.history-name {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.7;
  word-break: break-all;
  line-height: 1.3;
}
</style>
