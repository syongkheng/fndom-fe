// Default category options for the Apple Pay dashboard. Same pattern as
// Budget's category select — a fixed starter list, plus allow-create so
// users can add their own (the dashboard then merges custom ones already
// used back into the option list).
export const DEFAULT_APPLEPAY_CATEGORIES: readonly string[] = [
  'Food & Drink',
  'Groceries',
  'Shopping',
  'Transport',
  'Entertainment',
  'Bills & Utilities',
  'Health',
  'Travel',
  'Other',
]
