import { CATEGORY_ICON_SVG, PACKING_ICON_SVG, PIN_ICON_SVG, getCategoryIconSvg, getPackingIconSvg } from './TravelIconSvg'

export const TRAVEL_CATEGORIES = [
  { value: 'flight',        labelKey: 'travel.category.flight',        icon: CATEGORY_ICON_SVG.flight },
  { value: 'hotel',         labelKey: 'travel.category.hotel',         icon: CATEGORY_ICON_SVG.hotel },
  { value: 'dining',        labelKey: 'travel.category.dining',        icon: CATEGORY_ICON_SVG.dining },
  { value: 'attraction',    labelKey: 'travel.category.attraction',    icon: CATEGORY_ICON_SVG.attraction },
  { value: 'transport',     labelKey: 'travel.category.transport',     icon: CATEGORY_ICON_SVG.transport },
  { value: 'shopping',      labelKey: 'travel.category.shopping',      icon: CATEGORY_ICON_SVG.shopping },
  { value: 'entertainment', labelKey: 'travel.category.entertainment', icon: CATEGORY_ICON_SVG.entertainment },
  { value: 'nature',        labelKey: 'travel.category.nature',        icon: CATEGORY_ICON_SVG.nature },
  { value: 'other',         labelKey: 'travel.category.other',         icon: CATEGORY_ICON_SVG.other },
] as const

/** Key → icon SVG lookup. Falls back to a plain pin for unknown/missing categories. */
export const CATEGORY_ICON: Record<string, string> = Object.fromEntries(
  TRAVEL_CATEGORIES.map((c) => [c.value, c.icon]),
)

export const getCategoryIcon = (cat?: string | null): string => getCategoryIconSvg(cat)

export const PACKING_CATEGORIES = [
  { key: 'clothing',    icon: PACKING_ICON_SVG.clothing,   labelKey: 'travel.packing.categories.clothing' },
  { key: 'toiletries',  icon: PACKING_ICON_SVG.toiletries, labelKey: 'travel.packing.categories.toiletries' },
  { key: 'documents',   icon: PACKING_ICON_SVG.documents,  labelKey: 'travel.packing.categories.documents' },
  { key: 'health',      icon: PACKING_ICON_SVG.health,     labelKey: 'travel.packing.categories.health' },
  { key: 'electronics', icon: PACKING_ICON_SVG.electronics, labelKey: 'travel.packing.categories.electronics' },
  { key: 'misc',        icon: PACKING_ICON_SVG.misc,       labelKey: 'travel.packing.categories.misc' },
] as const

export const getPackingCategoryIcon = (cat?: string): string => getPackingIconSvg(cat)

export { PIN_ICON_SVG }
