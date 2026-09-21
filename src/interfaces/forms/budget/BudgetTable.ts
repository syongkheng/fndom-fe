import type { BudgetItem } from './BudgetItem'
import type { BudgetTemplateKey } from '@/constants/BudgetTemplates'

export interface BudgetCollaborator {
  userId: number
  username?: string
  email?: string
}

export interface BudgetTableSummary {
  sessionId: string
  name: string
  template: BudgetTemplateKey
  createdDt: number
  itemCount: number
  sumBudget: number
  sumActual: number
}

export interface BudgetTable {
  sessionId: string
  name: string
  template: BudgetTemplateKey
  createdDt: number
  isOwner: boolean
  items: BudgetItem[]
  collaborators: BudgetCollaborator[]
}
