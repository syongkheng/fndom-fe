<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import PageBackButton from '@/components/common/PageBackButton.vue'
import { useToast } from '@/composables/useToast'
import { useNav } from '@/hooks/useNav'
import { useAnalyticsStore } from '@/stores/analytics'
import type { AnalyticsGrant, AnalyticsSystemAdmin } from '@/interfaces/analytics.model'

const { t } = useI18n()
const toast = useToast()
const nav = useNav()
const store = useAnalyticsStore()

const loading = ref(true)
const systems = ref<AnalyticsSystemAdmin[]>([])
const grants = reactive<Record<string, AnalyticsGrant[]>>({})
const usernameInput = reactive<Record<string, string>>({})
const originsInput = reactive<Record<string, string>>({})
const busy = ref<string | null>(null)

function syncOrigins(list: AnalyticsSystemAdmin[]) {
  for (const s of list) originsInput[s.key] = s.allowedOrigins.join('\n')
}

async function load() {
  loading.value = true
  try {
    systems.value = await store.adminListSystems()
    syncOrigins(systems.value)
    const lists = await Promise.all(systems.value.map((s) => store.adminListAccess(s.key)))
    systems.value.forEach((s, i) => (grants[s.key] = lists[i]))
  } catch {
    toast.error(t('admin.analyticsAccess.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function grant(system: AnalyticsSystemAdmin) {
  const username = (usernameInput[system.key] ?? '').trim()
  if (!username) return
  busy.value = `grant:${system.key}`
  try {
    grants[system.key] = await store.adminGrant(system.key, username)
    usernameInput[system.key] = ''
    toast.success(t('admin.analyticsAccess.granted'))
  } catch {
    toast.error(t('admin.analyticsAccess.grantFailed'))
  } finally {
    busy.value = null
  }
}

async function revoke(system: AnalyticsSystemAdmin, g: AnalyticsGrant) {
  try {
    await ElMessageBox.confirm(
      t('admin.analyticsAccess.revokeConfirm', { user: g.username, system: system.displayName }),
      t('admin.analyticsAccess.revoke'),
      { confirmButtonText: t('admin.analyticsAccess.revoke'), cancelButtonText: t('common.cancel'), type: 'warning' },
    )
  } catch {
    return // cancelled
  }
  busy.value = `revoke:${system.key}:${g.userId}`
  try {
    grants[system.key] = await store.adminRevoke(system.key, g.userId)
    toast.success(t('admin.analyticsAccess.revoked'))
  } catch {
    toast.error(t('admin.analyticsAccess.revokeFailed'))
  } finally {
    busy.value = null
  }
}

async function saveOrigins(system: AnalyticsSystemAdmin) {
  const allowedOrigins = (originsInput[system.key] ?? '')
    .split('\n')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  busy.value = `origins:${system.key}`
  try {
    systems.value = await store.adminSaveSystem({ ...system, allowedOrigins })
    syncOrigins(systems.value)
    toast.success(t('admin.analyticsAccess.originsSaved'))
  } catch {
    toast.error(t('admin.analyticsAccess.originsSaveFailed'))
  } finally {
    busy.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="page-container aa-page">
    <div class="aa-header">
      <PageBackButton to="/admin" />
      <div>
        <h1 class="aa-title">{{ t('admin.analyticsAccess.title') }}</h1>
        <p class="aa-subtitle">{{ t('admin.analyticsAccess.subtitle') }}</p>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="8" animated />

    <div v-else class="aa-list">
      <section v-for="s in systems" :key="s.key" class="aa-card">
        <header class="aa-card-head">
          <div class="aa-card-name">
            <span class="aa-card-title">{{ s.displayName }}</span>
            <span class="aa-card-key">{{ s.key }}</span>
            <el-tag v-if="!s.active" size="small" type="info">{{ t('admin.analyticsAccess.inactive') }}</el-tag>
          </div>
          <el-button v-if="s.active" size="small" text type="primary" @click="nav.redirectTo(`/analytics/${s.key}`)">
            {{ t('admin.analyticsAccess.viewDashboard') }} →
          </el-button>
        </header>

        <div class="aa-breakpoints">
          <span class="aa-label">{{ t('admin.analyticsAccess.breakpoints') }}</span>
          <span v-for="b in s.breakpoints" :key="b.key" class="aa-chip">
            {{ b.label }} · {{ t(`analytics.sizes.${b.size}`) }}
          </span>
        </div>

        <div class="aa-section">
          <span class="aa-label">{{ t('admin.analyticsAccess.viewers') }}</span>
          <p v-if="!grants[s.key]?.length" class="aa-muted">{{ t('admin.analyticsAccess.noViewers') }}</p>
          <ul v-else class="aa-viewers">
            <li v-for="g in grants[s.key]" :key="g.userId" class="aa-viewer">
              <span class="aa-viewer-name">{{ g.username }}</span>
              <span class="aa-muted">{{ g.email }}</span>
              <el-button
                size="small"
                text
                type="danger"
                :loading="busy === `revoke:${s.key}:${g.userId}`"
                @click="revoke(s, g)"
              >
                {{ t('admin.analyticsAccess.revoke') }}
              </el-button>
            </li>
          </ul>
          <form class="aa-grant" @submit.prevent="grant(s)">
            <el-input
              v-model="usernameInput[s.key]"
              size="small"
              :placeholder="t('admin.analyticsAccess.usernamePlaceholder')"
              clearable
            />
            <el-button
              size="small"
              type="primary"
              native-type="submit"
              :disabled="!usernameInput[s.key]?.trim()"
              :loading="busy === `grant:${s.key}`"
            >
              {{ t('admin.analyticsAccess.grant') }}
            </el-button>
          </form>
        </div>

        <div class="aa-section">
          <span class="aa-label">{{ t('admin.analyticsAccess.origins') }}</span>
          <p class="aa-muted">{{ t('admin.analyticsAccess.originsHint') }}</p>
          <el-input v-model="originsInput[s.key]" type="textarea" :rows="2" size="small" />
          <el-button
            class="aa-save"
            size="small"
            :loading="busy === `origins:${s.key}`"
            @click="saveOrigins(s)"
          >
            {{ t('admin.analyticsAccess.originsSave') }}
          </el-button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.aa-page {
  max-width: 720px;
  width: 100%;
  justify-self: center;
  padding-bottom: 48px;
}

.aa-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 24px 0 24px;
}

.aa-title {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--color-heading);
  margin: 0 0 4px;
}

.aa-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.55;
  margin: 0;
  line-height: 1.45;
}

.aa-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.aa-card {
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-background-soft);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.aa-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.aa-card-name {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.aa-card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
}

.aa-card-key {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.5;
}

.aa-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.55;
  margin-bottom: 6px;
}

.aa-breakpoints {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.aa-breakpoints .aa-label {
  width: 100%;
  margin-bottom: 0;
}

.aa-chip {
  font-size: 0.75rem;
  padding: 2px 8px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--color-text);
}

.aa-muted {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.55;
  margin: 0 0 6px;
}

.aa-viewers {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
}

.aa-viewer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  border-bottom: 1px solid var(--color-border);
}

.aa-viewer:last-child {
  border-bottom: none;
}

.aa-viewer .aa-muted {
  margin: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aa-viewer-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--color-heading);
}

.aa-grant {
  display: flex;
  gap: 8px;
}

.aa-save {
  margin-top: 8px;
}
</style>
