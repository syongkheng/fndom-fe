export const TRAVEL_CATEGORIES = [
  { value: 'flight',        label: 'Flight',        emoji: '✈️' },
  { value: 'hotel',         label: 'Hotel',         emoji: '🏨' },
  { value: 'dining',        label: 'Dining',        emoji: '🍽️' },
  { value: 'attraction',    label: 'Attraction',    emoji: '🎡' },
  { value: 'transport',     label: 'Transport',     emoji: '🚌' },
  { value: 'shopping',      label: 'Shopping',      emoji: '🛍️' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎭' },
  { value: 'nature',        label: 'Nature',        emoji: '🌿' },
  { value: 'other',         label: 'Other',         emoji: '📋' },
] as const

/** Key → emoji lookup. Falls back to 📋 for unknown/missing categories. */
export const CATEGORY_EMOJI: Record<string, string> = Object.fromEntries(
  TRAVEL_CATEGORIES.map((c) => [c.value, c.emoji]),
)

export const getCategoryEmoji = (cat?: string | null): string =>
  (cat && CATEGORY_EMOJI[cat]) || '📋'
