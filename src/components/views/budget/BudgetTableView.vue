<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, User } from '@element-plus/icons-vue'
import { useNav } from '@/hooks/useNav'
import { useBudgetStore } from '@/stores/budget'
import { useToast } from '@/composables/useToast'
import { storeToRefs } from 'pinia'
import BudgetItemTable from './BudgetItemTable.vue'
import { BUDGET_TEMPLATES } from '@/constants/BudgetTemplates'
import { BUDGET_ICON_SVG } from '@/constants/BudgetIconSvg'
import TravelIcon from '@/components/icons/TravelIcon.vue'

const route = useRoute()
const nav = useNav()
const { t } = useI18n()
const budgetStore = useBudgetStore()
const toast = useToast()
const { activeTable, isLoadingTable } = storeToRefs(budgetStore)

const sessionId = computed(() => route.params.sessionId as string)

const activeTab = ref<'to_buy' | 'bought' | 'category' | 'all'>('to_buy')

const editingName = ref(false)
const nameDraft = ref('')

onMounted(async () => {
  await budgetStore.fetchTable(sessionId.value)
})

const handleKeydown = async (e: KeyboardEvent) => {
  const isUndoCombo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z'
  if (!isUndoCombo || !budgetStore.canUndoDelete) return
  e.preventDefault()
  const restored = await budgetStore.undoDelete()
  toast.dismissActionToasts()
  toast[restored ? 'success' : 'error'](t(restored ? 'budget.table.restoreSuccess' : 'budget.table.restoreFailed'))
}

window.addEventListener('keydown', handleKeydown)
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  budgetStore.clearPendingUndo()
})

const toBuyItems = computed(() => activeTable.value?.items.filter((i) => i.status === 'to_buy') ?? [])
const boughtItems = computed(() => activeTable.value?.items.filter((i) => i.status === 'bought') ?? [])
const allItems = computed(() => activeTable.value?.items ?? [])

const categoryOptions = computed(() => {
  const presets = activeTable.value ? BUDGET_TEMPLATES[activeTable.value.template]?.categories ?? [] : []
  const used = allItems.value.map((i) => i.category?.trim()).filter((c): c is string => !!c)
  return Array.from(new Set([...presets, ...used]))
})

const groupedByCategory = computed(() => {
  const map = new Map<string, typeof allItems.value>()
  for (const item of allItems.value) {
    const key = item.category?.trim() || t('budget.table.uncategorized')
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
})

const expandedCategories = ref<string[]>([])
watch(
  groupedByCategory,
  (groups) => {
    const known = new Set(expandedCategories.value)
    for (const [cat] of groups) {
      if (!known.has(cat)) expandedCategories.value.push(cat)
    }
  },
  { immediate: true },
)

const activeItems = computed(() => {
  switch (activeTab.value) {
    case 'to_buy': return toBuyItems.value
    case 'bought': return boughtItems.value
    case 'all': return allItems.value
    default: return allItems.value
  }
})

const sumBudget = computed(() => activeItems.value.reduce((acc, i) => acc + (i.budgetAmount ?? 0), 0))
const sumActual = computed(() => activeItems.value.reduce((acc, i) => acc + (i.actualAmount ?? 0), 0))

const formatAmount = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'SGD' })

const startEditName = () => {
  if (!activeTable.value?.isOwner) return
  nameDraft.value = activeTable.value.name
  editingName.value = true
}

const saveName = async () => {
  editingName.value = false
  const trimmed = nameDraft.value.trim()
  if (!trimmed || !activeTable.value || trimmed === activeTable.value.name) return
  const ok = await budgetStore.renameTable(sessionId.value, trimmed)
  if (!ok) toast.error(t('budget.table.renameFailed'))
}

const showShareDialog = ref(false)
const inviteEmail = ref('')
const inviting = ref(false)

const submitInvite = async () => {
  if (!inviteEmail.value.trim()) return
  inviting.value = true
  const collaborator = await budgetStore.addCollaborator(sessionId.value, inviteEmail.value.trim())
  inviting.value = false
  if (!collaborator) {
    toast.error(t('budget.table.inviteFailed'))
    return
  }
  inviteEmail.value = ''
  toast.success(t('budget.table.inviteSuccess'))
}

const removeCollaborator = async (userId: number) => {
  const ok = await budgetStore.removeCollaborator(sessionId.value, userId)
  if (!ok) toast.error(t('budget.table.removeCollaboratorFailed'))
}
</script>

<template>
  <div class="page-container">
    <div class="table-nav">
      <el-button circle size="small" @click="nav.redirectTo('/budget')">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
    </div>

    <div v-if="isLoadingTable" class="loading-state">
      <el-skeleton :rows="6" animated />
    </div>

    <template v-else-if="activeTable">
      <header class="table-header">
        <div class="title-row">
          <el-input
            v-if="editingName"
            v-model="nameDraft"
            class="name-input"
            autofocus
            @blur="saveName"
            @keyup.enter="saveName"
          />
          <h1 v-else class="table-title" :class="{ editable: activeTable.isOwner }" @click="startEditName">
            <TravelIcon :svg="BUDGET_ICON_SVG[activeTable.template]" />
            {{ activeTable.name }}
          </h1>
        </div>

        <div class="collab-row">
          <el-tooltip
            v-for="c in activeTable.collaborators"
            :key="c.userId"
            :content="c.username || c.email"
            placement="top"
          >
            <el-avatar :size="26" class="collab-avatar">
              <el-icon><User /></el-icon>
            </el-avatar>
          </el-tooltip>
          <el-button size="small" @click="showShareDialog = true">{{ t('budget.table.share') }}</el-button>
        </div>
      </header>

      <div class="tab-bar">
        <button
          v-for="tab in (['to_buy', 'bought', 'category', 'all'] as const)"
          :key="tab"
          class="tab-btn"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ t(`budget.table.tab.${tab}`) }}
        </button>
      </div>

      <div class="tab-body">
        <div v-if="activeTab === 'category'" class="category-groups">
          <div v-if="groupedByCategory.length === 0" class="empty-text">{{ t('budget.table.noItems') }}</div>
          <el-collapse v-else v-model="expandedCategories">
            <el-collapse-item v-for="[cat, items] in groupedByCategory" :key="cat" :title="cat" :name="cat">
              <BudgetItemTable
                :session-id="sessionId"
                :items="items"
                :show-category="false"
                :preset-category="cat === t('budget.table.uncategorized') ? '' : cat"
                :category-options="categoryOptions"
              />
            </el-collapse-item>
          </el-collapse>
        </div>

        <template v-else>
          <div v-if="activeItems.length === 0" class="empty-text">{{ t('budget.table.noItems') }}</div>
          <BudgetItemTable :session-id="sessionId" :items="activeItems" :category-options="categoryOptions" />
        </template>
      </div>

      <footer v-if="activeTab !== 'category'" class="sum-footer">
        <span>{{ t('budget.table.sumBudget') }} {{ formatAmount(sumBudget) }}</span>
        <span>{{ t('budget.table.sumActual') }} {{ formatAmount(sumActual) }}</span>
      </footer>
    </template>

    <div v-else class="empty-text">{{ t('budget.table.notFound') }}</div>

    <el-dialog v-model="showShareDialog" :title="t('budget.table.shareTitle')" width="90%" style="max-width: 440px">
      <div v-if="activeTable?.isOwner" class="invite-form">
        <el-input v-model="inviteEmail" :placeholder="t('budget.table.invitePlaceholder')" @keyup.enter="submitInvite" />
        <el-button type="primary" :loading="inviting" :disabled="!inviteEmail.trim()" @click="submitInvite">
          {{ t('budget.table.invite') }}
        </el-button>
      </div>
      <ul class="collaborator-list">
        <li v-for="c in activeTable?.collaborators" :key="c.userId" class="collaborator-row">
          <span>{{ c.username || c.email }}</span>
          <el-button v-if="activeTable?.isOwner" size="small" text type="danger" @click="removeCollaborator(c.userId)">
            {{ t('budget.table.remove') }}
          </el-button>
        </li>
        <li v-if="!activeTable?.collaborators.length" class="empty-text">{{ t('budget.table.noCollaborators') }}</li>
      </ul>
    </el-dialog>
  </div>
</template>

<style scoped>
.table-nav {
  margin-bottom: 12px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-heading);
}

.table-title.editable {
  cursor: text;
}

.name-input {
  font-size: 1.3rem;
  max-width: 320px;
}

.collab-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.collab-avatar {
  background: var(--el-color-primary-light-7);
  color: var(--el-color-primary);
}

.tab-bar {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 12px;
  overflow-x: auto;
}

.tab-btn {
  border: none;
  background: none;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.6;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
}

.tab-btn.active {
  opacity: 1;
  color: var(--el-color-primary);
  border-bottom-color: var(--el-color-primary);
}

.sum-footer {
  display: flex;
  gap: 20px;
  justify-content: flex-end;
  padding: 10px 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text);
  opacity: 0.75;
  border-top: 1px solid var(--color-border);
  margin-top: 4px;
}

.empty-text {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.5;
  padding: 16px 4px;
}

.loading-state {
  padding: 20px 0;
}

.invite-form {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.collaborator-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.collaborator-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border);
}
</style>
