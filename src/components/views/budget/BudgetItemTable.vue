<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Delete } from '@element-plus/icons-vue'
import { useBudgetStore, BUDGET_UNDO_WINDOW_MS } from '@/stores/budget'
import { useToast } from '@/composables/useToast'
import type { BudgetItem, BudgetItemStatus } from '@/interfaces/forms/budget/BudgetItem'

const props = withDefaults(
  defineProps<{
    sessionId: string
    items: BudgetItem[]
    showCategory?: boolean
    presetCategory?: string
    categoryOptions?: string[]
  }>(),
  { showCategory: true, presetCategory: '', categoryOptions: () => [] },
)

const { t } = useI18n()
const budgetStore = useBudgetStore()
const toast = useToast()

const save = async (item: BudgetItem, field: keyof BudgetItem): Promise<boolean> => {
  const ok = await budgetStore.updateItem(props.sessionId, item.id, { [field]: item[field] } as Partial<BudgetItem>)
  if (!ok) toast.error(t('budget.table.saveFailed'))
  return ok
}

const toggleStatus = async (item: BudgetItem) => {
  const next: BudgetItemStatus = item.status === 'bought' ? 'to_buy' : 'bought'
  item.status = next
  const ok = await save(item, 'status')
  if (ok) {
    const statusLabel = t(next === 'bought' ? 'budget.table.status.bought' : 'budget.table.status.toBuy')
    toast.success(t('budget.table.statusChanged', { name: item.name, status: statusLabel }))
  }
}

const confirmRemove = async (item: BudgetItem) => {
  const ok = await budgetStore.deleteItem(props.sessionId, item.id)
  if (!ok) {
    toast.error(t('budget.table.deleteFailed'))
    return
  }

  toast.action(
    t('budget.table.itemDeletedToast', { name: item.name }),
    {
      label: t('budget.table.undo'),
      onClick: async () => {
        const restored = await budgetStore.undoDelete()
        toast[restored ? 'success' : 'error'](t(restored ? 'budget.table.restoreSuccess' : 'budget.table.restoreFailed'))
      },
    },
    { duration: BUDGET_UNDO_WINDOW_MS, ring: true, icon: Delete },
  )
}

const newName = ref('')
const newCategory = ref(props.presetCategory)
const newBudget = ref<number | undefined>(undefined)
const newActual = ref<number | undefined>(undefined)
const newNotes = ref('')
const adding = ref(false)

const submitNew = async () => {
  if (!newName.value.trim()) return
  adding.value = true
  const created = await budgetStore.createItem(props.sessionId, {
    name: newName.value.trim(),
    category: newCategory.value.trim() || undefined,
    budgetAmount: newBudget.value,
    actualAmount: newActual.value,
    notes: newNotes.value.trim() || undefined,
  })
  adding.value = false
  if (!created) {
    toast.error(t('budget.table.addFailed'))
    return
  }
  newName.value = ''
  newBudget.value = undefined
  newActual.value = undefined
  newNotes.value = ''
}
</script>

<template>
  <div class="budget-item-table">
    <el-table :data="items" size="small" class="items-table">
      <el-table-column :label="t('budget.table.col.name')" min-width="140">
        <template #default="{ row }">
          <el-input v-model="row.name" class="cell-input" @blur="save(row, 'name')" @keyup.enter="($event.target as HTMLElement)?.blur()" />
        </template>
      </el-table-column>
      <el-table-column v-if="showCategory" :label="t('budget.table.col.category')" min-width="130">
        <template #default="{ row }">
          <el-select
            v-model="row.category"
            class="cell-input"
            filterable
            allow-create
            default-first-option
            clearable
            :placeholder="t('budget.table.newCategory')"
            @change="save(row, 'category')"
          >
            <el-option v-for="opt in categoryOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column :label="t('budget.table.col.budget')" width="120" align="right">
        <template #default="{ row }">
          <el-input-number
            v-model="row.budgetAmount"
            class="cell-number"
            :controls="false"
            :precision="2"
            @change="save(row, 'budgetAmount')"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('budget.table.col.actual')" width="120" align="right">
        <template #default="{ row }">
          <el-input-number
            v-model="row.actualAmount"
            class="cell-number"
            :controls="false"
            :precision="2"
            @change="save(row, 'actualAmount')"
          />
        </template>
      </el-table-column>
      <el-table-column :label="t('budget.table.col.notes')" min-width="160">
        <template #default="{ row }">
          <el-input v-model="row.notes" class="cell-input" @blur="save(row, 'notes')" />
        </template>
      </el-table-column>
      <el-table-column :label="t('budget.table.col.status')" width="110" align="center">
        <template #default="{ row }">
          <el-tag
            class="status-tag"
            :type="row.status === 'bought' ? 'success' : 'info'"
            effect="light"
            @click="toggleStatus(row)"
          >
            {{ row.status === 'bought' ? t('budget.table.status.bought') : t('budget.table.status.toBuy') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column width="48" align="center">
        <template #default="{ row }">
          <el-button circle size="small" @click="confirmRemove(row)">
            <el-icon style="font-size: 0.7rem"><Delete /></el-icon>
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="add-row">
      <el-input v-model="newName" size="small" class="add-input add-name" :placeholder="t('budget.table.newName')" @keyup.enter="submitNew" />
      <el-select
        v-if="showCategory"
        v-model="newCategory"
        size="small"
        class="add-input add-category"
        filterable
        allow-create
        default-first-option
        clearable
        :placeholder="t('budget.table.newCategory')"
      >
        <el-option v-for="opt in categoryOptions" :key="opt" :label="opt" :value="opt" />
      </el-select>
      <el-input-number v-model="newBudget" size="small" class="add-input add-number" :controls="false" :precision="2" :placeholder="t('budget.table.col.budget')" />
      <el-input-number v-model="newActual" size="small" class="add-input add-number" :controls="false" :precision="2" :placeholder="t('budget.table.col.actual')" />
      <el-input v-model="newNotes" size="small" class="add-input add-notes" :placeholder="t('budget.table.col.notes')" @keyup.enter="submitNew" />
      <el-button size="small" type="primary" :loading="adding" :disabled="!newName.trim()" @click="submitNew">
        {{ t('budget.table.add') }}
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.budget-item-table {
  width: 100%;
}

.cell-input :deep(.el-input__wrapper),
.cell-input :deep(.el-select__wrapper) {
  box-shadow: none;
  background: transparent;
  padding-left: 4px;
}

.cell-input {
  width: 100%;
}

.cell-number {
  width: 100%;
}

.cell-number :deep(.el-input__wrapper) {
  box-shadow: none;
  background: transparent;
}

.status-tag {
  cursor: pointer;
  user-select: none;
}

.add-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 4px;
  border-top: 1px dashed var(--color-border);
  flex-wrap: wrap;
}

.add-input {
  flex: 1;
  min-width: 90px;
}

.add-name {
  flex: 1.4;
}

.add-category {
  flex: 1;
}

.add-number {
  max-width: 100px;
}

.add-notes {
  flex: 1.4;
}
</style>
