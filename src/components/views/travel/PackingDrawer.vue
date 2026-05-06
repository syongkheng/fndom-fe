<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PACKING_CATEGORIES } from '@/constants/TravelCategories'
import type { PackingItem } from '@/interfaces/forms/itinerary/PackingItem'

const props = defineProps<{
  modelValue: boolean
  item: PackingItem | null
  isNew: boolean
  drawerDirection?: 'rtl' | 'btt'
  drawerSize?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', item: PackingItem): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()

const makeBlank = (): PackingItem => ({
  _localIndex: `packing-${Date.now()}`,
  label: '',
  category: 'misc',
  packed: false,
})

const form = ref<PackingItem>(makeBlank())

watch(
  () => props.item,
  (val) => { form.value = val ? { ...val } : makeBlank() },
  { immediate: true },
)

const labelError = ref(false)

const handleSave = () => {
  if (!form.value.label.trim()) { labelError.value = true; return }
  labelError.value = false
  emit('save', { ...form.value, label: form.value.label.trim() })
  emit('update:modelValue', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    :direction="drawerDirection ?? 'rtl'"
    :size="drawerSize ?? '380px'"
    :title="isNew ? t('travel.packing.newItem') : t('travel.packing.editItem')"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <div class="packing-form">

      <!-- Category chips -->
      <div class="form-field">
        <div class="field-label">{{ t('travel.packing.category') }}</div>
        <div class="cat-chips">
          <button
            v-for="cat in PACKING_CATEGORIES"
            :key="cat.key"
            type="button"
            class="cat-chip"
            :class="{ active: form.category === cat.key }"
            @click="form.category = cat.key"
          >
            {{ cat.emoji }} {{ t(cat.labelKey) }}
          </button>
        </div>
      </div>

      <!-- Item name -->
      <div class="form-field">
        <div class="field-label">{{ t('travel.packing.label') }} *</div>
        <el-input
          v-model="form.label"
          :placeholder="t('travel.packing.labelPlaceholder')"
          :status="labelError ? 'error' : ''"
          @input="labelError = false"
        />
      </div>

      <!-- Quantity -->
      <div class="form-field">
        <div class="field-label">{{ t('travel.packing.quantity') }}</div>
        <el-input-number
          v-model="form.quantity"
          :min="1"
          :placeholder="'e.g. 3'"
          style="width: 100%"
          controls-position="right"
        />
      </div>

      <!-- Packed toggle -->
      <div class="form-field">
        <div
          class="packed-toggle"
          :class="{ 'packed-toggle--active': form.packed }"
          @click="form.packed = !form.packed"
        >
          <span class="packed-check" :class="{ 'packed-check--active': form.packed }">
            <span v-if="form.packed">✓</span>
          </span>
          <span class="packed-label">{{ t('travel.packing.packed') }}</span>
        </div>
      </div>

    </div>

    <template #footer>
      <div class="drawer-footer">
        <el-button @click="handleCancel">{{ t('travel.packing.cancel') }}</el-button>
        <el-button type="primary" :disabled="!form.label.trim()" @click="handleSave">
          {{ isNew ? t('travel.packing.addItem').replace('+ ', '') : t('travel.packing.saveChanges') }}
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.packing-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 4px 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
}

/* Category chips */
.cat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cat-chip {
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.cat-chip:hover {
  border-color: var(--el-color-primary);
}

.cat-chip.active {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
}

/* Packed toggle */
.packed-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  user-select: none;
}

.packed-toggle--active {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
}

.packed-check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
}

.packed-check--active {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
}

.packed-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
