<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Calendar } from '@element-plus/icons-vue'
import { dateKeyForDay, formatShortDate } from '@/composables/useTravelDayGroups'

// One-tap "move to Day N" picker. Replaces the old calendar popover so an
// undated trip can still be planned by day number.
const props = defineProps<{
  day?: number
  dayCount: number
  startKey?: string
}>()

const emit = defineEmits<{ (e: 'select', day: number | undefined): void }>()

const { t } = useI18n()
const open = ref(false)

const days = computed(() =>
  Array.from({ length: props.dayCount }, (_, i) => {
    const n = i + 1
    const key = props.startKey ? dateKeyForDay(props.startKey, n) : undefined
    return { n, label: key ? formatShortDate(key) : '' }
  }),
)

const pick = (n: number | undefined) => {
  emit('select', n)
  open.value = false
}
</script>

<template>
  <el-popover v-model:visible="open" placement="bottom-end" trigger="click" :width="236" popper-class="day-chip-popper">
    <template #reference>
      <button type="button" class="day-chip-trigger" :class="{ 'day-chip-trigger--set': !!props.day }" :title="t('travel.dayAssign.moveToDay')" @click.stop>
        <el-icon v-if="!props.day"><Calendar /></el-icon>
        <template v-else>{{ t('travel.planner.dayShort', { n: props.day }) }}</template>
      </button>
    </template>
    <div class="day-chip-menu" @click.stop>
      <div class="day-chip-title">{{ t('travel.dayAssign.moveToDay') }}</div>
      <div class="day-chip-grid">
        <button
          v-for="d in days"
          :key="d.n"
          type="button"
          class="day-chip"
          :class="{ 'day-chip--active': d.n === props.day }"
          @click="pick(d.n)"
        >
          <span class="day-chip-n">{{ d.n }}</span>
          <span v-if="d.label" class="day-chip-date">{{ d.label }}</span>
        </button>
      </div>
      <button v-if="props.day" type="button" class="day-chip-unschedule" @click="pick(undefined)">
        {{ t('travel.dayAssign.removeFromDay') }}
      </button>
    </div>
  </el-popover>
</template>

<style scoped>
.day-chip-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}

.day-chip-trigger:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.day-chip-trigger--set {
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  border-color: transparent;
  color: var(--el-color-primary);
}

.day-chip-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.day-chip-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.55;
}

.day-chip-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}

.day-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 2px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  cursor: pointer;
  color: var(--color-text);
}

.day-chip:hover {
  border-color: var(--el-color-primary);
}

.day-chip--active {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
}

.day-chip-n {
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.1;
}

.day-chip-date {
  font-size: 0.6rem;
  opacity: 0.75;
  white-space: nowrap;
}

.day-chip-unschedule {
  border: none;
  background: none;
  color: var(--el-color-danger);
  font-size: 0.78rem;
  cursor: pointer;
  text-align: left;
  padding: 2px 0;
}
</style>
