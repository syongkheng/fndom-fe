<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { MagicStick, Link } from '@element-plus/icons-vue'

export interface NoteSuggestion {
  id: number
  country: string
  title: string
  url: string
  category: string | null
  mandatory: number
  min_days_before_arrival: number | null
  max_advance_hours: number | null
  notes: string | null
}

const props = defineProps<{
  country?: string
}>()

const emit = defineEmits<{
  (e: 'add', s: NoteSuggestion): void
}>()

const { t } = useI18n()
const suggestions = ref<NoteSuggestion[]>([])

const load = async () => {
  if (!props.country?.trim()) { suggestions.value = []; return }
  try {
    const res = await HttpClient.get(ApiRoute.SUGGESTION.NOTES(props.country.trim()))
    suggestions.value = res.data?.data ?? []
  } catch {
    suggestions.value = []
  }
}

watch(() => props.country, load, { immediate: true })

const deadlineCopy = (s: NoteSuggestion): string | undefined => {
  if (s.min_days_before_arrival) return t('travel.note.deadlineWithinDays', { days: s.min_days_before_arrival })
  if (s.max_advance_hours) return t('travel.note.deadlineBeforeLanding', { hours: s.max_advance_hours })
  return undefined
}
</script>

<template>
  <div v-if="suggestions.length > 0" class="note-suggestion-panel">
    <div class="suggestion-label"><el-icon><MagicStick /></el-icon> {{ t('travel.suggestion.noteLabel') }}</div>
    <div class="note-suggestion-list">
      <div v-for="s in suggestions" :key="s.id" class="note-suggestion-row">
        <div class="note-suggestion-main">
          <span class="note-suggestion-title">{{ s.title }}</span>
          <el-tag :type="s.mandatory ? 'danger' : 'info'" size="small" effect="plain">
            {{ s.mandatory ? t('travel.note.mandatoryBadge') : t('travel.note.optionalBadge') }}
          </el-tag>
        </div>
        <div v-if="deadlineCopy(s)" class="note-suggestion-deadline">{{ deadlineCopy(s) }}</div>
        <div class="note-suggestion-actions">
          <a :href="s.url" target="_blank" rel="noopener" class="note-suggestion-link">
            <el-icon><Link /></el-icon> {{ t('travel.note.openOfficialSite') }}
          </a>
          <el-button size="small" @click="emit('add', s)">{{ t('travel.note.addItem') }}</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.note-suggestion-panel {
  margin: 4px 0 12px;
  padding: 10px 12px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: 8px;
}
.suggestion-label {
  font-size: 0.73rem;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}
.note-suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.note-suggestion-row {
  background: #fff;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 8px 10px;
}
.note-suggestion-main {
  display: flex;
  align-items: center;
  gap: 8px;
}
.note-suggestion-title {
  font-size: 0.85rem;
  font-weight: 600;
}
.note-suggestion-deadline {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
.note-suggestion-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.note-suggestion-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  color: var(--el-color-primary);
  text-decoration: none;
}
.note-suggestion-link:hover {
  text-decoration: underline;
}
</style>
