<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { useNav } from '@/hooks/useNav'
import { useBudgetStore } from '@/stores/budget'
import { useToast } from '@/composables/useToast'
import { storeToRefs } from 'pinia'
import { BUDGET_TEMPLATES, BUDGET_TEMPLATE_LIST, type BudgetTemplateKey } from '@/constants/BudgetTemplates'
import { BUDGET_ICON_SVG } from '@/constants/BudgetIconSvg'
import TravelIcon from '@/components/icons/TravelIcon.vue'

const { t } = useI18n()
const nav = useNav()
const budgetStore = useBudgetStore()
const toast = useToast()
const { myTables, sharedTables, isLoadingList } = storeToRefs(budgetStore)

const showCreateDialog = ref(false)
const newTableName = ref('')
const newTableTemplate = ref<BudgetTemplateKey>('home_reno')
const creating = ref(false)

onMounted(() => {
  budgetStore.fetchTables()
})

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const formatAmount = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 })

const handleCreate = () => {
  newTableName.value = ''
  newTableTemplate.value = 'home_reno'
  showCreateDialog.value = true
}

const submitCreate = async () => {
  if (!newTableName.value.trim()) return
  creating.value = true
  const sessionId = await budgetStore.createTable(newTableName.value.trim(), newTableTemplate.value)
  creating.value = false
  if (!sessionId) {
    toast.error(t('budget.list.failed'))
    return
  }
  showCreateDialog.value = false
  nav.redirectTo(`/budget/${sessionId}`)
}

const confirmDelete = (sessionId: string, name: string) => {
  ElMessageBox.confirm(t('budget.list.deleteConfirm', { name }), t('budget.list.deleteTitle'), {
    confirmButtonText: t('budget.list.delete'),
    cancelButtonText: t('budget.list.cancel'),
    type: 'warning',
    confirmButtonClass: 'el-button--danger',
  })
    .then(async () => {
      const ok = await budgetStore.deleteTable(sessionId)
      if (ok) toast.success(t('budget.list.deleted'))
      else toast.error(t('budget.list.failedDelete'))
    })
    .catch(() => {})
}
</script>

<template>
  <div class="page-container">
    <header class="list-header">
      <div>
        <p class="list-eyebrow"><TravelIcon :svg="BUDGET_ICON_SVG.wallet" /> {{ t('budget.list.eyebrow') }}</p>
        <h1 class="list-title">{{ t('budget.list.title') }}</h1>
        <p class="list-subtitle">{{ t('budget.list.subtitle') }}</p>
      </div>
      <el-button type="primary" :loading="creating" @click="handleCreate">{{ t('budget.list.newTable') }}</el-button>
    </header>

    <section class="table-section">
      <h2 class="section-label">{{ t('budget.list.myTables') }}</h2>

      <div v-if="isLoadingList" class="empty-state">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else-if="myTables.length === 0" class="empty-state">
        <p class="empty-text">{{ t('budget.list.noTables') }}</p>
      </div>

      <div v-else class="table-grid">
        <div
          v-for="tbl in myTables"
          :key="tbl.sessionId"
          class="budget-card"
          @click="nav.redirectTo(`/budget/${tbl.sessionId}`)"
        >
          <div class="budget-card-body">
            <div class="budget-title">
              <TravelIcon :svg="BUDGET_ICON_SVG[tbl.template]" />
              {{ tbl.name }}
            </div>
            <div class="budget-meta">
              <span>{{ formatDate(tbl.createdDt) }}</span>
              <span>· {{ t('budget.list.itemCount', { n: tbl.itemCount }) }}</span>
            </div>
            <div class="budget-sums">
              <span>{{ t('budget.list.budget') }} {{ formatAmount(tbl.sumBudget) }}</span>
              <span>{{ t('budget.list.actual') }} {{ formatAmount(tbl.sumActual) }}</span>
            </div>
          </div>
          <div class="budget-card-actions" @click.stop>
            <el-tooltip :content="t('budget.list.deleteTable')" placement="top">
              <el-button circle size="small" @click="confirmDelete(tbl.sessionId, tbl.name)">
                <el-icon style="font-size: 0.75rem"><Delete /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </div>
    </section>

    <section class="table-section">
      <h2 class="section-label">{{ t('budget.list.sharedWithMe') }}</h2>

      <div v-if="sharedTables.length === 0" class="empty-state">
        <p class="empty-text">{{ t('budget.list.noShared') }}</p>
      </div>

      <div v-else class="table-grid">
        <div
          v-for="tbl in sharedTables"
          :key="tbl.sessionId"
          class="budget-card budget-card--shared"
          @click="nav.redirectTo(`/budget/${tbl.sessionId}`)"
        >
          <div class="budget-card-body">
            <div class="budget-title">
              <TravelIcon :svg="BUDGET_ICON_SVG[tbl.template]" />
              {{ tbl.name }}
            </div>
            <div class="budget-meta">
              <span>{{ formatDate(tbl.createdDt) }}</span>
              <span>· {{ t('budget.list.itemCount', { n: tbl.itemCount }) }}</span>
            </div>
            <div class="budget-sums">
              <span>{{ t('budget.list.budget') }} {{ formatAmount(tbl.sumBudget) }}</span>
              <span>{{ t('budget.list.actual') }} {{ formatAmount(tbl.sumActual) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <el-dialog v-model="showCreateDialog" :title="t('budget.list.newTableTitle')" width="90%" style="max-width: 420px">
      <div class="dialog-form">
        <span class="dlabel">{{ t('budget.list.tableName') }} <span class="req">*</span></span>
        <el-input v-model="newTableName" :placeholder="t('budget.list.tableNamePlaceholder')" maxlength="255" @keyup.enter="submitCreate" />

        <span class="dlabel">{{ t('budget.list.mainCategory') }} <span class="req">*</span></span>
        <el-select v-model="newTableTemplate" class="template-select">
          <template #label="{ value }">
            <span class="template-option">
              <TravelIcon :svg="BUDGET_ICON_SVG[value]" />
              {{ t(BUDGET_TEMPLATES[value as BudgetTemplateKey].i18nKey) }}
            </span>
          </template>
          <el-option v-for="tpl in BUDGET_TEMPLATE_LIST" :key="tpl.key" :value="tpl.key" :label="t(tpl.i18nKey)">
            <span class="template-option">
              <TravelIcon :svg="BUDGET_ICON_SVG[tpl.key]" />
              {{ t(tpl.i18nKey) }}
            </span>
          </el-option>
        </el-select>
        <span class="dhint">{{ t('budget.list.mainCategoryHint') }}</span>
      </div>
      <template #footer>
        <el-button @click="showCreateDialog = false">{{ t('budget.list.cancel') }}</el-button>
        <el-button type="primary" :loading="creating" :disabled="!newTableName.trim()" @click="submitCreate">
          {{ t('budget.list.create') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
  gap: 12px;
}

.list-eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--el-color-primary);
  margin-bottom: 6px;
}

.list-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-heading);
}

.list-subtitle {
  font-size: 0.83rem;
  color: var(--color-text);
  opacity: 0.6;
  margin-top: 4px;
}

.table-section {
  margin-bottom: 36px;
}

.section-label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.5;
  margin-bottom: 12px;
}

.table-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.budget-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  background: var(--color-background-soft);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  transition: border-color 0.15s, background 0.15s;
}

.budget-card:hover {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 4%, var(--color-background-soft));
  box-shadow: 0 4px 14px color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}

.budget-card--shared {
  border-style: dashed;
}

.budget-card-body {
  flex: 1;
  min-width: 0;
}

.budget-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}

.budget-meta {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.6;
  margin-bottom: 6px;
}

.budget-sums {
  display: flex;
  gap: 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.85;
}

.budget-card-actions {
  flex-shrink: 0;
}

.empty-state {
  padding: 20px 0;
}

.empty-text {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.5;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dlabel {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.7;
  margin-top: 8px;
}

.req {
  color: #f87171;
}

.template-select {
  width: 100%;
}

.template-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.dhint {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.5;
}

@media (max-width: 540px) {
  .list-header {
    flex-direction: column;
    align-items: stretch;
  }

  .table-grid {
    grid-template-columns: 1fr;
  }
}
</style>
