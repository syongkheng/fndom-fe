export const TRAVEL_CATEGORIES = [
  { value: 'flight',        labelKey: 'travel.category.flight',        emoji: '✈️' },
  { value: 'hotel',         labelKey: 'travel.category.hotel',         emoji: '🏨' },
  { value: 'dining',        labelKey: 'travel.category.dining',        emoji: '🍽️' },
  { value: 'attraction',    labelKey: 'travel.category.attraction',    emoji: '🎡' },
  { value: 'transport',     labelKey: 'travel.category.transport',     emoji: '🚌' },
  { value: 'shopping',      labelKey: 'travel.category.shopping',      emoji: '🛍️' },
  { value: 'entertainment', labelKey: 'travel.category.entertainment', emoji: '🎭' },
  { value: 'nature',        labelKey: 'travel.category.nature',        emoji: '🌿' },
  { value: 'other',         labelKey: 'travel.category.other',         emoji: '📋' },
] as const

/** Key → emoji lookup. Falls back to 📋 for unknown/missing categories. */
export const CATEGORY_EMOJI: Record<string, string> = Object.fromEntries(
  TRAVEL_CATEGORIES.map((c) => [c.value, c.emoji]),
)

export const getCategoryEmoji = (cat?: string | null): string =>
  (cat && CATEGORY_EMOJI[cat]) || '📋'

export const PACKING_CATEGORIES = [
  { key: 'clothing',    emoji: '👕', labelKey: 'travel.packing.categories.clothing' },
  { key: 'toiletries',  emoji: '🧴', labelKey: 'travel.packing.categories.toiletries' },
  { key: 'documents',   emoji: '📄', labelKey: 'travel.packing.categories.documents' },
  { key: 'health',      emoji: '💊', labelKey: 'travel.packing.categories.health' },
  { key: 'electronics', emoji: '🔌', labelKey: 'travel.packing.categories.electronics' },
  { key: 'misc',        emoji: '🎒', labelKey: 'travel.packing.categories.misc' },
] as const

export const getPackingCategoryEmoji = (cat?: string): string =>
  PACKING_CATEGORIES.find((c) => c.key === cat)?.emoji ?? '🎒'
