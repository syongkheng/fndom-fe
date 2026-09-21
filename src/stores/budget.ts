import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import type { BudgetItem, BudgetItemStatus } from '@/interfaces/forms/budget/BudgetItem'
import type { BudgetTable, BudgetTableSummary, BudgetCollaborator } from '@/interfaces/forms/budget/BudgetTable'
import type { BudgetTemplateKey } from '@/constants/BudgetTemplates'

export const BUDGET_UNDO_WINDOW_MS = 10000

interface PendingItemDeletion {
  item: BudgetItem
  sessionId: string
}

export const useBudgetStore = defineStore('budget', () => {
  const myTables = ref<BudgetTableSummary[]>([])
  const sharedTables = ref<BudgetTableSummary[]>([])
  const activeTable = ref<BudgetTable | null>(null)
  const isLoadingList = ref(false)
  const isLoadingTable = ref(false)

  const lastDeletedItem = ref<PendingItemDeletion | null>(null)
  const canUndoDelete = computed(() => lastDeletedItem.value !== null)
  let undoTimer: ReturnType<typeof setTimeout> | null = null

  function clearPendingUndo() {
    if (undoTimer) {
      clearTimeout(undoTimer)
      undoTimer = null
    }
    lastDeletedItem.value = null
  }

  async function fetchTables() {
    isLoadingList.value = true
    const res = await HttpClient.get(ApiRoute.BUDGET.GET_ALL).catch(() => null)
    if (res?.data?.data) {
      myTables.value = res.data.data.myTables ?? []
      sharedTables.value = res.data.data.sharedTables ?? []
    }
    isLoadingList.value = false
  }

  async function createTable(name: string, template: BudgetTemplateKey): Promise<string | null> {
    const res = await HttpClient.post(ApiRoute.BUDGET.CREATE, { name, template }).catch(() => null)
    return res?.data?.data?.sessionId ?? null
  }

  async function fetchTable(sessionId: string) {
    clearPendingUndo()
    isLoadingTable.value = true
    const res = await HttpClient.get(ApiRoute.BUDGET.RETRIEVE_BY_ID(sessionId)).catch(() => null)
    activeTable.value = (res?.data?.data as BudgetTable) ?? null
    isLoadingTable.value = false
    return activeTable.value
  }

  async function renameTable(sessionId: string, name: string): Promise<boolean> {
    const res = await HttpClient.post(ApiRoute.BUDGET.RENAME(sessionId), { name }).catch(() => null)
    if (res?.data?.data?.renamed && activeTable.value) activeTable.value.name = name
    return !!res?.data?.data?.renamed
  }

  async function deleteTable(sessionId: string): Promise<boolean> {
    const res = await HttpClient.post(ApiRoute.BUDGET.DELETE(sessionId), {}).catch(() => null)
    if (res?.data?.data?.deleted) {
      myTables.value = myTables.value.filter((t) => t.sessionId !== sessionId)
    }
    return !!res?.data?.data?.deleted
  }

  async function createItem(sessionId: string, input: Partial<BudgetItem>): Promise<BudgetItem | null> {
    const res = await HttpClient.post(ApiRoute.BUDGET.CREATE_ITEM(sessionId), input).catch(() => null)
    const item = res?.data?.data as BudgetItem | undefined
    if (item && activeTable.value) activeTable.value.items.push(item)
    return item ?? null
  }

  async function updateItem(sessionId: string, itemId: string, input: Partial<BudgetItem>): Promise<boolean> {
    const res = await HttpClient.post(ApiRoute.BUDGET.UPDATE_ITEM(sessionId, itemId), input).catch(() => null)
    const item = res?.data?.data as BudgetItem | undefined
    if (item && activeTable.value) {
      const idx = activeTable.value.items.findIndex((i) => i.id === itemId)
      if (idx !== -1) activeTable.value.items[idx] = item
    }
    return !!item
  }

  async function deleteItem(sessionId: string, itemId: string): Promise<boolean> {
    const item = activeTable.value?.items.find((i) => i.id === itemId)
    const res = await HttpClient.post(ApiRoute.BUDGET.DELETE_ITEM(sessionId, itemId), {}).catch(() => null)
    if (!res?.data?.data?.deleted) return false

    if (activeTable.value) {
      activeTable.value.items = activeTable.value.items.filter((i) => i.id !== itemId)
    }

    if (item) {
      if (undoTimer) clearTimeout(undoTimer)
      lastDeletedItem.value = { item, sessionId }
      undoTimer = setTimeout(() => { lastDeletedItem.value = null }, BUDGET_UNDO_WINDOW_MS)
    }

    return true
  }

  // Restores the most recently deleted item within the 10s undo window
  // (button click or Ctrl+Z). No-ops safely once the window has expired.
  async function undoDelete(): Promise<boolean> {
    const pending = lastDeletedItem.value
    if (!pending) return false

    const res = await HttpClient.post(ApiRoute.BUDGET.RESTORE_ITEM(pending.sessionId, pending.item.id), {}).catch(() => null)
    const restored = res?.data?.data as BudgetItem | undefined
    if (!restored) return false

    clearPendingUndo()

    if (activeTable.value?.sessionId === pending.sessionId) {
      activeTable.value.items.push(restored)
      activeTable.value.items.sort((a, b) => a.sortOrder - b.sortOrder)
    }

    return true
  }

  async function addCollaborator(sessionId: string, email: string): Promise<BudgetCollaborator | null> {
    const res = await HttpClient.post(ApiRoute.BUDGET.ADD_COLLABORATOR(sessionId), { email }).catch(() => null)
    const collaborator = res?.data?.data as BudgetCollaborator | undefined
    if (collaborator && activeTable.value) activeTable.value.collaborators.push(collaborator)
    return collaborator ?? null
  }

  async function removeCollaborator(sessionId: string, userId: number): Promise<boolean> {
    const res = await HttpClient.post(ApiRoute.BUDGET.REMOVE_COLLABORATOR(sessionId, userId), {}).catch(() => null)
    if (res?.data?.data?.removed && activeTable.value) {
      activeTable.value.collaborators = activeTable.value.collaborators.filter((c) => c.userId !== userId)
    }
    return !!res?.data?.data?.removed
  }

  return {
    myTables,
    sharedTables,
    activeTable,
    isLoadingList,
    isLoadingTable,
    lastDeletedItem,
    canUndoDelete,
    fetchTables,
    createTable,
    fetchTable,
    renameTable,
    deleteTable,
    createItem,
    updateItem,
    deleteItem,
    undoDelete,
    clearPendingUndo,
    addCollaborator,
    removeCollaborator,
  }
})

export type { BudgetItemStatus }
