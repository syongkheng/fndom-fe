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
