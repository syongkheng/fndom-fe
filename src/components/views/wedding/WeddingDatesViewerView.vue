<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { ElMessage } from 'element-plus'

interface WeddingDateComment {
  id: number
  dateId: number
  commenterName: string
  comment: string
  createdAt: number
}

interface WeddingDateEntry {
  id: number
  date: string
  ceremonyType: string
  auspiciousNotes: string | null
  status: string
  comments: WeddingDateComment[]
}

interface WeddingPublicSession {
  id: number
  shortCode: string
  title: string
  dates: WeddingDateEntry[]
}

const route = useRoute()
const shortCode = route.params.shortCode as string

const loading = ref(false)
const session = ref<WeddingPublicSession | null>(null)
const notFound = ref(false)

const activeCommentDateId = ref<number | null>(null)
const commenterName = ref('')
const commentText = ref('')
const commentSubmitting = ref(false)

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  accepted: '#10b981',
  rejected: '#ef4444',
}

onMounted(async () => {
  loading.value = true
  try {
    const { data } = await HttpClient.get(ApiRoute.WEDDING.DATES_GET_PUBLIC(shortCode))
    session.value = data.data.session
    if (!session.value) notFound.value = true
  } catch (e: any) {
    if (e?.response?.status === 404) notFound.value = true
    else ElMessage.error('Failed to load session')
  } finally {
    loading.value = false
  }
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function toggleCommentForm(dateId: number) {
  activeCommentDateId.value = activeCommentDateId.value === dateId ? null : dateId
  commentText.value = ''
}

async function submitComment(dateId: number) {
  if (!commenterName.value.trim() || !commentText.value.trim()) return
  commentSubmitting.value = true
  try {
    const { data } = await HttpClient.post(ApiRoute.WEDDING.DATES_ADD_COMMENT(shortCode), {
      date_id: dateId,
      commenter_name: commenterName.value.trim(),
      comment: commentText.value.trim(),
    })
    const dateEntry = session.value?.dates.find(d => d.id === dateId)
    if (dateEntry) dateEntry.comments.push(data.data.comment)
    commentText.value = ''
    activeCommentDateId.value = null
    ElMessage.success('Comment added!')
  } catch {
    ElMessage.error('Failed to add comment')
  } finally {
    commentSubmitting.value = false
  }
}
</script>

<template>
  <div class="viewer-page" v-loading="loading">
    <div v-if="notFound" class="not-found">
      <p>Session not found.</p>
    </div>

    <template v-else-if="session">
      <div class="viewer-header">
        <h1 class="viewer-title">{{ session.title }}</h1>
        <p class="viewer-subtitle">Proposed dates for review — leave a comment on any date</p>
      </div>

      <div v-if="session.dates.length === 0" class="empty-state">No dates have been added yet.</div>

      <div v-else class="date-list">
        <div
          v-for="entry in session.dates"
          :key="entry.id"
          class="date-card"
          :class="`date-card--${entry.status}`"
        >
          <div class="date-card-top">
            <span class="date-label">{{ formatDate(entry.date) }}</span>
            <span class="ceremony-label">{{ entry.ceremonyType }}</span>
            <span
              class="status-badge"
              :style="{
                color: STATUS_COLORS[entry.status],
                borderColor: STATUS_COLORS[entry.status] + '55',
                background: STATUS_COLORS[entry.status] + '18',
              }"
            >{{ entry.status }}</span>
          </div>

          <p v-if="entry.auspiciousNotes" class="auspicious-notes">{{ entry.auspiciousNotes }}</p>

          <div v-if="entry.comments.length > 0" class="comments-list">
            <div v-for="c in entry.comments" :key="c.id" class="comment-item">
              <span class="comment-author">{{ c.commenterName }}</span>
              <span class="comment-text">{{ c.comment }}</span>
              <span class="comment-meta">{{ formatTimestamp(c.createdAt) }}</span>
            </div>
          </div>

          <button class="toggle-comment-btn" @click="toggleCommentForm(entry.id)">
            {{ activeCommentDateId === entry.id ? '✕ Cancel' : '+ Add comment' }}
          </button>

          <Transition name="expand">
            <div v-if="activeCommentDateId === entry.id" class="comment-form">
              <input
                v-model="commenterName"
                class="comment-input"
                placeholder="Your name"
                maxlength="128"
              />
              <textarea
                v-model="commentText"
                class="comment-textarea"
                placeholder="Your comment…"
                maxlength="1000"
                rows="3"
              />
              <button
                class="submit-btn"
                :disabled="!commenterName.trim() || !commentText.trim() || commentSubmitting"
                @click="submitComment(entry.id)"
              >{{ commentSubmitting ? 'Submitting…' : 'Submit' }}</button>
            </div>
          </Transition>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.viewer-page {
  max-width: 600px;
  margin: 0 auto;
  padding: 32px 16px;
  min-height: 60vh;
}

.viewer-header {
  text-align: center;
  margin-bottom: 28px;
}

.viewer-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-heading);
}

.viewer-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
  margin-top: 6px;
}

.date-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.date-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  background: var(--color-background-soft);
  transition: border-color 0.2s, opacity 0.2s;
}

.date-card--accepted { border-color: #10b98155; }
.date-card--rejected { opacity: 0.6; }

.date-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.date-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
}

.ceremony-label {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background-mute);
  color: var(--color-text);
}

.status-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid;
  text-transform: capitalize;
}

.auspicious-notes {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.75;
  margin: 0 0 12px;
  font-style: italic;
}

.comments-list {
  border-top: 1px solid var(--color-border);
  padding-top: 10px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comment-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 6px;
  align-items: baseline;
  font-size: 0.82rem;
}

.comment-author {
  font-weight: 700;
  color: var(--color-heading);
  white-space: nowrap;
}

.comment-text { color: var(--color-text); }

.comment-meta {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.5;
  white-space: nowrap;
}

.toggle-comment-btn {
  font-size: 0.78rem;
  color: var(--el-color-primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-weight: 600;
}

.toggle-comment-btn:hover { text-decoration: underline; }

.comment-form {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comment-input,
.comment-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.85rem;
  font-family: inherit;
  box-sizing: border-box;
}

.comment-textarea {
  resize: vertical;
  min-height: 72px;
}

.submit-btn {
  align-self: flex-end;
  padding: 6px 18px;
  border-radius: 8px;
  border: none;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.submit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.not-found,
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: var(--color-text);
  opacity: 0.5;
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: opacity 0.15s, max-height 0.25s;
  max-height: 400px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
