<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { getPackingCategoryEmoji } from '@/constants/TravelCategories'

export interface PackingSuggestion {
  id: number
  trip_type: string
  label: string
  label_key: string | null
  category: string | null
}

const emit = defineEmits<{
  (e: 'add', s: PackingSuggestion): void
  (e: 'drag-start'): void
  (e: 'drag-end'): void
}>()

const { t } = useI18n()
const suggestions = ref<PackingSuggestion[]>([])

onMounted(async () => {
  try {
    const res = await HttpClient.get(ApiRoute.SUGGESTION.PACKING)
    suggestions.value = res.data?.data ?? []
  } catch {
    suggestions.value = []
  }
})

const onDragStart = (s: PackingSuggestion, e: DragEvent) => {
  e.dataTransfer!.effectAllowed = 'copy'
  e.dataTransfer!.setData('suggestion/packing', JSON.stringify(s))
  emit('drag-start')
}
</script>

<template>
  <div v-if="suggestions.length > 0" class="packing-suggestion-panel">
    <div class="suggestion-label">💡 {{ t('travel.suggestion.packingLabel') }}</div>
    <div class="suggestion-chips">
      <div
        v-for="s in suggestions"
        :key="s.id"
        class="suggestion-chip"
        draggable="true"
        @dragstart="onDragStart(s, $event)"
        @dragend="emit('drag-end')"
        @click="emit('add', s)"
        :title="s.trip_type"
      >
        {{ getPackingCategoryEmoji(s.category ?? undefined) }} {{ s.label_key ? t(s.label_key) : s.label }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.packing-suggestion-panel {
  padding: 10px 16px 4px;
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
  margin-bottom: 8px;
}
.suggestion-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 9px;
  background: var(--el-fill-color-light, #f5f7fa);
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  font-size: 0.78rem;
  cursor: grab;
  user-select: none;
  transition: border-color 0.15s;
}
.suggestion-chip:hover {
  border-color: var(--el-color-primary);
}
.suggestion-chip:active {
  cursor: grabbing;
}
</style>
