<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { categories } from '@/constants/houseplan/furniture'
import { useHousePlanStore } from '@/stores/housePlan'

const { t } = useI18n()
const store = useHousePlanStore()

const groups = computed(() =>
  categories
    .map((cat) => ({ cat, items: store.fullCatalogue.filter((c) => c.category === cat) }))
    .filter((g) => g.items.length),
)

function onPick(e: Event) {
  const select = e.target as HTMLSelectElement
  if (select.value) store.addFromCatalogue(select.value)
  select.value = ''
}

const cm = (m: number) => Math.round(m * 100)
</script>

<template>
  <select class="bp-btn picker" :aria-label="t('house.addFurniture')" @change="onPick">
    <option value="">{{ t('house.addFurniture') }}</option>
    <optgroup v-for="g in groups" :key="g.cat" :label="t(`house.categories.${g.cat}`)">
      <option v-for="c in g.items" :key="c.id" :value="c.id">
        {{ store.displayName(c.id, c.name) }} ({{ cm(c.w) }}×{{ cm(c.d) }}×{{ cm(c.h) }})
      </option>
    </optgroup>
  </select>
</template>

<style scoped>
.picker {
  min-width: 0;
  max-width: 100%;
}
</style>
