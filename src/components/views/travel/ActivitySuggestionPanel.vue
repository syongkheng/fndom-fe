<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { getCategoryEmoji } from '@/constants/TravelCategories'

export interface ActivitySuggestion {
  id: number
  destination_tag: string
  title: string
  category: string | null
  estimated_hours: number | null
  description: string | null
}

const props = defineProps<{
  destination?: string
}>()

const emit = defineEmits<{
  (e: 'add', s: ActivitySuggestion): void
  (e: 'drag-start'): void
  (e: 'drag-end'): void
}>()

const { t } = useI18n()
const suggestions = ref<ActivitySuggestion[]>([])
const loading = ref(false)

const hasDestination = () => !!props.destination?.trim()

const load = async () => {
  if (!hasDestination()) { suggestions.value = []; return }
  loading.value = true
  try {
    const res = await HttpClient.get(ApiRoute.SUGGESTION.ACTIVITIES(props.destination!.trim()))
    suggestions.value = res.data?.data ?? []
  } catch {
    suggestions.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.destination, load, { immediate: true })

const onDragStart = (s: ActivitySuggestion, e: DragEvent) => {
  e.dataTransfer!.effectAllowed = 'copy'
  e.dataTransfer!.setData('suggestion/activity', JSON.stringify(s))
  emit('drag-start')
}
</script>

<template>
  <!-- No destination: prompt -->
  <div v-if="!destination?.trim()" class="activity-suggestion-panel activity-suggestion-panel--empty">
    <span class="suggestion-prompt-icon">📍</span>
    <span class="suggestion-prompt-text">{{ t('travel.suggestion.addDestination') }}</span>
  </div>

  <!-- Has destination + suggestions -->
  <div v-else-if="suggestions.length > 0" class="activity-suggestion-panel">
    <div class="suggestion-label">💡 {{ t('travel.suggestion.activityLabel', { destination }) }}</div>
    <div class="suggestion-chips">
      <div
        v-for="s in suggestions"
        :key="s.id"
        class="suggestion-chip"
        draggable="true"
        @dragstart="onDragStart(s, $event)"
        @dragend="emit('drag-end')"
        @click="emit('add', s)"
        :title="s.description ?? s.title"
      >
        {{ getCategoryEmoji(s.category) }} {{ s.title }}
        <span v-if="s.estimated_hours" class="chip-dur">· {{ s.estimated_hours }}h</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.activity-suggestion-panel {
  margin: 4px 0 12px;
  padding: 10px 12px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: 8px;
}
.activity-suggestion-panel--empty {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
}
.suggestion-prompt-icon {
  font-size: 0.9rem;
}
.suggestion-label {
  font-size: 0.73rem;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}
.suggestion-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.suggestion-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 10px;
  background: #fff;
  border: 1px solid var(--el-border-color);
  border-radius: 14px;
  font-size: 0.8rem;
  cursor: grab;
  user-select: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.suggestion-chip:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.suggestion-chip:active {
  cursor: grabbing;
}
.chip-dur {
  font-size: 0.7rem;
  color: var(--el-text-color-secondary);
}
</style>
