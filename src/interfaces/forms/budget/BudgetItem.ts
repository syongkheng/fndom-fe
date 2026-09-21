export type BudgetItemStatus = 'to_buy' | 'bought'

export interface BudgetItem {
  /** Opaque public identifier (server-generated UUID) — never the DB row's auto-increment id. */
  id: string
  name: string
  category?: string
  status: BudgetItemStatus
  budgetAmount?: number
  actualAmount?: number
  notes?: string
  sortOrder: number
}
