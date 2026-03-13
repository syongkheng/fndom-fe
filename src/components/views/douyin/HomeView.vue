<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { StorageUtils, StorageKey } from '@/utilities/StorageUtils'
import { useAuthenticationStore } from '@/stores/authentication'

interface DouyinLiveResult {
  userId: string
  isLive: boolean
  nickname: string | null
  title: string | null
  viewerCount: number | null
  totalViewers: string | null
  coverUrl: string | null
  streamUrl: string | null
  roomId: string | null
  anchorId: string | null
  secAnchorId: string | null
  fromCache: boolean
}

interface DouyinRankUser {
  id: number
  nickname: string
  avatarUrl: string | null
  payGradeLevel: number
  fansClubLevel: number
  fansClubStatus: number
  rank: number
  score: number
}

interface RecentSearch {
  userId: string
  nickname: string
}

const MAX_RECENT = 5
const LIVE_INTERVAL = 30
const RANK_INTERVAL = 30

const authStore = useAuthenticationStore()

// ── search ─────────────────────────────────────────────────────────────────
const userId = ref('')
const loading = ref(false)
const errorMsg = ref('')
const result = ref<DouyinLiveResult | null>(null)
const recentSearches = ref<RecentSearch[]>([])
const liveCountdown = ref(0)
let liveTimer: ReturnType<typeof setInterval> | null = null

const getStorageMap = (): Record<string, RecentSearch[]> =>
  StorageUtils.get<Record<string, RecentSearch[]>>(StorageKey.DOUYIN_RECENT) ?? {}

const loadRecent = () => {
  const username = authStore.userProfile.username
  if (!username) return
  recentSearches.value = getStorageMap()[username] ?? []
}

const saveRecent = () => {
  const username = authStore.userProfile.username
  if (!username) return
  const map = getStorageMap()
  map[username] = recentSearches.value
  StorageUtils.set(StorageKey.DOUYIN_RECENT, map)
}

const upsertRecent = (entry: RecentSearch) => {
  recentSearches.value = [
    entry,
    ...recentSearches.value.filter((s) => s.userId !== entry.userId),
  ].slice(0, MAX_RECENT)
  saveRecent()
}

const removeRecent = (searchUserId: string) => {
  recentSearches.value = recentSearches.value.filter((s) => s.userId !== searchUserId)
  saveRecent()
}

const stopLiveTimer = () => {
  if (liveTimer) { clearInterval(liveTimer); liveTimer = null }
  liveCountdown.value = 0
}

const startLiveTimer = () => {
  stopLiveTimer()
  liveCountdown.value = LIVE_INTERVAL
  liveTimer = setInterval(() => {
    liveCountdown.value--
    if (liveCountdown.value <= 0) checkLive()
  }, 1000)
}

const checkLive = async () => {
  const id = (result.value?.userId ?? userId.value).trim()
  if (!id) return
  try {
    const res = await HttpClient.get(ApiRoute.DOUYIN.CHECK_LIVE, { params: { userId: id } })
    const data = res.data.data as DouyinLiveResult
    result.value = data
    startLiveTimer()
    if (data.isLive && data.roomId) fetchRankList()
  } catch { /* silent on refresh */ }
}

const check = async () => {
  const id = userId.value.trim()
  if (!id) { errorMsg.value = 'Please enter a Douyin user ID.'; return }

  errorMsg.value = ''
  loading.value = true
  result.value = null
  rankList.value = []
  stopRankTimer()
  stopLiveTimer()

  try {
    const res = await HttpClient.get(ApiRoute.DOUYIN.CHECK_LIVE, { params: { userId: id } })
    const data = res.data.data as DouyinLiveResult
    result.value = data
    upsertRecent({ userId: id, nickname: data.nickname ?? id })
    startLiveTimer()
    if (data.isLive && data.roomId) fetchRankList()
  } catch {
    errorMsg.value = 'Failed to check live status. Please try again.'
  } finally {
    loading.value = false
  }
}

const onTagClick = (search: RecentSearch) => { userId.value = search.userId; check() }
const onKeydown = (e: KeyboardEvent) => { if (e.key === 'Enter') check() }

// ── rankings ────────────────────────────────────────────────────────────────
const rankList = ref<DouyinRankUser[]>([])
const rankLoading = ref(false)
const rankError = ref('')
const rankCountdown = ref(0)
let rankTimer: ReturnType<typeof setInterval> | null = null

const stopRankTimer = () => {
  if (rankTimer) { clearInterval(rankTimer); rankTimer = null }
  rankCountdown.value = 0
}

const startRankTimer = () => {
  stopRankTimer()
  rankCountdown.value = RANK_INTERVAL
  rankTimer = setInterval(() => {
    rankCountdown.value--
    if (rankCountdown.value <= 0) fetchRankList()
  }, 1000)
}

const fetchRankList = async () => {
  if (!result.value?.roomId || !result.value?.anchorId) return
  rankLoading.value = true
  rankError.value = ''
  try {
    const res = await HttpClient.get(ApiRoute.DOUYIN.RANK_LIST, {
      params: {
        roomId: result.value.roomId,
        anchorId: result.value.anchorId,
      },
    })
    rankList.value = res.data.data as DouyinRankUser[]
    startRankTimer()
  } catch {
    rankError.value = 'Failed to load rankings.'
    stopRankTimer()
  } finally {
    rankLoading.value = false
  }
}

// ── misc ─────────────────────────────────────────────────────────────────────
const copied = ref(false)

const copyStreamUrl = async () => {
  if (!result.value?.streamUrl) return
  await navigator.clipboard.writeText(result.value.streamUrl)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

const openLivePage = () => {
  if (result.value) window.open(`https://live.douyin.com/${result.value.userId}`, '_blank')
}

onMounted(() => loadRecent())
onUnmounted(() => { stopLiveTimer(); stopRankTimer() })
</script>

<template>
  <div class="douyin-root">
    <div class="douyin-header">
      <h1 class="douyin-title">Douyin Live</h1>
      <p class="douyin-subtitle">Check if a Douyin user is currently livestreaming</p>
    </div>

    <div class="search-bar">
      <el-input
        v-model="userId"
        placeholder="Enter Douyin user ID"
        @keydown="onKeydown"
        clearable
      />
      <el-button type="primary" :loading="loading" @click="check">Check</el-button>
    </div>
    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <div v-if="recentSearches.length" class="recent-tags">
      <span class="recent-label">Recent</span>
      <el-tag
        v-for="search in recentSearches"
        :key="search.userId"
        closable
        size="small"
        class="recent-tag"
        @click="onTagClick(search)"
        @close="removeRecent(search.userId)"
      >
        {{ search.nickname }}
      </el-tag>
    </div>

    <div v-if="loading" class="state-block">
      <el-skeleton :rows="2" animated />
    </div>

    <div v-if="result && !loading" class="content-area">
      <!-- Left: live status -->
      <div class="left-col">
        <div class="result-card">
          <img
            v-if="result.isLive && result.coverUrl"
            :src="result.coverUrl"
            class="cover-img"
            alt="Stream cover"
          />
          <div class="result-header">
            <span class="status-dot" :class="{ live: result.isLive }" />
            <span class="status-label">{{ result.isLive ? 'Live' : 'Offline' }}</span>
            <el-tag size="small" :type="result.fromCache ? 'warning' : 'success'" effect="plain" class="source-tag">
              {{ result.fromCache ? 'Cached' : 'Fresh' }}
            </el-tag>
            <span v-if="liveCountdown > 0" class="live-countdown">{{ liveCountdown }}s</span>
          </div>
          <div class="result-meta">
            <span v-if="result.nickname" class="meta-chip">{{ result.nickname }}</span>
            <span v-if="result.title" class="meta-chip muted">{{ result.title }}</span>
            <span v-if="result.viewerCount != null" class="meta-chip">{{ result.viewerCount.toLocaleString() }} viewers</span>
            <span v-if="result.totalViewers" class="meta-chip muted">{{ result.totalViewers }} total</span>
          </div>
          <div class="result-actions">
            <el-button type="primary" link @click="openLivePage">Open &rarr;</el-button>
            <el-button v-if="result.isLive && result.streamUrl" type="primary" link @click="copyStreamUrl">
              {{ copied ? 'Copied!' : 'Copy HLS' }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- Right: rankings -->
      <div v-if="result.isLive && result.roomId" class="right-col">
        <div v-if="rankLoading && !rankList.length" class="state-block">
          <el-skeleton :rows="3" animated />
        </div>

        <p v-if="rankError && !rankLoading" class="error-msg">{{ rankError }}</p>

        <div v-if="rankList.length" class="rank-card">
          <div class="rank-header">
            <span>Top Audience</span>
            <span class="rank-countdown">{{ rankLoading ? 'refreshing…' : `in ${rankCountdown}s` }}</span>
          </div>
          <div class="rank-list">
            <div v-for="user in rankList" :key="user.id" class="rank-row">
              <span class="rank-num">#{{ user.rank }}</span>
              <img v-if="user.avatarUrl" :src="user.avatarUrl" class="rank-avatar" :alt="user.nickname" />
              <span class="rank-nickname">{{ user.nickname }}</span>
              <div class="rank-badges">
                <el-tag size="small" type="warning" effect="plain" class="rank-tag">{{ user.payGradeLevel }}</el-tag>
                <el-tag
                  size="small"
                  effect="plain"
                  class="rank-tag"
                  :type="user.fansClubLevel > 0 && user.fansClubStatus === 1 ? 'success' : 'info'"
                >{{ user.fansClubLevel > 0 ? `F${user.fansClubLevel}` : '—' }}</el-tag>
              </div>
              <span class="rank-score">{{ user.score.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.douyin-root {
  max-width: 960px;
  width: 100%;
  justify-self: center;
  display: flex;
  flex-direction: column;
  padding-bottom: 48px;
}

.douyin-header {
  padding: 24px 0 16px;
}

.douyin-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 4px;
  line-height: 1.2;
}

.douyin-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.65;
  margin: 0;
}

.search-bar {
  display: flex;
  gap: 8px;
  max-width: 400px;
  margin-bottom: 6px;
}

.error-msg {
  font-size: 0.82rem;
  color: var(--el-color-danger);
  margin-bottom: 8px;
}

.recent-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.recent-label {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.5;
}

.recent-tag { cursor: pointer; }

.state-block { margin-top: 20px; }

/* ── two-column layout ─────────────────── */
.content-area {
  display: flex;
  gap: 16px;
  margin-top: 20px;
  align-items: flex-start;
}

.left-col {
  flex: 0 0 260px;
  min-width: 0;
}

.right-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── result card ───────────────────────── */
.result-card {
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background-soft);
}

.cover-img {
  width: 100%;
  max-height: 140px;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 10px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  flex-shrink: 0;
}

.status-dot.live {
  background: #22c55e;
  box-shadow: 0 0 5px rgba(34, 197, 94, 0.5);
}

.status-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-heading);
}

.source-tag { margin-left: auto; }

.live-countdown {
  font-size: 0.72rem;
  font-family: monospace;
  color: var(--color-text);
  opacity: 0.45;
}

.result-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.meta-chip {
  font-size: 0.82rem;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-chip.muted {
  opacity: 0.55;
  font-size: 0.78rem;
}

.result-actions {
  display: flex;
  gap: 10px;
}

.result-actions .el-button { font-size: 0.82rem; }

/* ── rank card ─────────────────────────── */
.rank-card {
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background-soft);
}

.rank-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.6;
}

.rank-countdown {
  font-weight: 400;
  font-family: monospace;
  text-transform: none;
  letter-spacing: 0;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rank-num {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text);
  opacity: 0.35;
  min-width: 20px;
  text-align: right;
  flex-shrink: 0;
}

.rank-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.rank-nickname {
  font-size: 0.84rem;
  color: var(--color-heading);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-badges {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.rank-tag {
  width: 36px;
  justify-content: center;
  font-size: 0.72rem;
  padding: 0;
}

.rank-score {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.5;
  flex-shrink: 0;
  min-width: 32px;
  text-align: right;
}

@media (max-width: 640px) {
  .content-area { flex-direction: column; }
  .left-col { flex: none; width: 100%; }
  .douyin-title { font-size: 1.15rem; }
}
</style>
