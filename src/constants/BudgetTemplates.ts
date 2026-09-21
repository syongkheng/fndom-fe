export type BudgetTemplateKey = 'home_reno' | 'wedding' | 'travel' | 'other'

export interface BudgetTemplateDef {
  key: BudgetTemplateKey
  i18nKey: string
  categories: readonly string[]
}

// Picked once when a budget table is created — fixes which preset category
// suggestions the item-level category select offers (users can still type a
// custom one via allow-create; BudgetTableView merges it back into the list).
// Each key doubles as its lookup into BUDGET_ICON_SVG.
export const BUDGET_TEMPLATES: Record<BudgetTemplateKey, BudgetTemplateDef> = {
  home_reno: {
    key: 'home_reno',
    i18nKey: 'budget.template.homeReno',
    categories: ['Furniture', 'Appliance', 'Kitchen', 'Bedroom', 'Electronics', 'Decor', 'Cleaning', 'Pet', 'Other'],
  },
  wedding: {
    key: 'wedding',
    i18nKey: 'budget.template.wedding',
    categories: [
      'Venue', 'Catering', 'Attire', 'Photography', 'Decor', 'Entertainment',
      'Invitations', 'Favors', 'Beauty', 'Transport', 'Other',
    ],
  },
  travel: {
    key: 'travel',
    i18nKey: 'budget.template.travel',
    categories: ['Flights', 'Accommodation', 'Food', 'Activities', 'Transport', 'Shopping', 'Insurance', 'Visa', 'Other'],
  },
  other: {
    key: 'other',
    i18nKey: 'budget.template.other',
    categories: ['Miscellaneous', 'Other'],
  },
}

export const BUDGET_TEMPLATE_LIST: BudgetTemplateDef[] = Object.values(BUDGET_TEMPLATES)
