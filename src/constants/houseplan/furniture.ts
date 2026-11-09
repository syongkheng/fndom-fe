export type Category = 'Living' | 'Dining' | 'Bedroom' | 'Study' | 'Kitchen' | 'Utility' | 'Custom'

/**
 * One solid in a furniture model. Coordinates are metres, relative to the item's footprint centre:
 * px/pz is the part's centre on the floor plan (pz is plan y), py is the height of its underside.
 */
export type PartShape = 'box' | 'cylinder' | 'sphere' | 'roll' | 'half'

export interface FurniturePart {
  shape: PartShape
  /** full extents before rotation */
  sx: number
  sy: number
  sz: number
  px: number
  py: number
  pz: number
  /** clockwise degrees on the plan, any angle */
  ry: number
  /** box: corner rounding, 0 (sharp) to 1 (fully round) */
  round: number
  /** cylinder: top size relative to the bottom, 0.1 to 1 */
  taper: number
  /** '#rrggbb'; omitted = the category colour */
  color?: string
}

export const PART_SHAPES: PartShape[] = ['box', 'cylinder', 'sphere', 'roll', 'half']

export interface CatalogItem {
  id: string
  name: string
  /** metres */
  w: number
  d: number
  h: number
  category: Category
  /** user-built model; built-in pieces get theirs from furnitureModels.ts, and a piece with neither is a plain box */
  parts?: FurniturePart[]
}

const c = (id: string, name: string, w: number, d: number, h: number, category: Category): CatalogItem => ({ id, name, w, d, h, category })

export const catalogue: CatalogItem[] = [
  c('sofa3', '3-seater sofa', 2.1, 0.9, 0.8, 'Living'),
  c('sofaL', 'L-shaped sofa', 2.6, 1.6, 0.8, 'Living'),
  c('armchair', 'Armchair', 0.85, 0.85, 0.8, 'Living'),
  c('coffee', 'Coffee table', 1.1, 0.6, 0.45, 'Living'),
  c('tvc', 'TV console', 1.8, 0.4, 0.5, 'Living'),
  c('dine6', 'Dining table (6 pax)', 1.6, 0.9, 0.75, 'Dining'),
  c('dine4', 'Dining table (4 pax)', 1.2, 0.8, 0.75, 'Dining'),
  c('round', 'Round table', 1.0, 1.0, 0.75, 'Dining'),
  c('king', 'King bed', 1.83, 1.9, 0.5, 'Bedroom'),
  c('queen', 'Queen bed', 1.52, 1.9, 0.5, 'Bedroom'),
  c('ssingle', 'Super single bed', 1.07, 1.9, 0.5, 'Bedroom'),
  c('single', 'Single bed', 0.91, 1.9, 0.5, 'Bedroom'),
  c('wardrobe', 'Wardrobe', 1.8, 0.6, 2.2, 'Bedroom'),
  c('bedside', 'Bedside table', 0.45, 0.4, 0.5, 'Bedroom'),
  c('desk', 'Study desk', 1.2, 0.6, 0.75, 'Study'),
  c('bookshelf', 'Bookshelf', 0.8, 0.3, 1.8, 'Study'),
  c('fridge', 'Fridge', 0.7, 0.7, 1.8, 'Kitchen'),
  c('washer', 'Washing machine', 0.6, 0.6, 0.85, 'Utility'),
  c('shoe', 'Shoe cabinet', 1.0, 0.35, 1.0, 'Utility'),
]

export const categories: Category[] = ['Living', 'Dining', 'Bedroom', 'Study', 'Kitchen', 'Utility', 'Custom']

const catColors: Record<Category, number> = {
  Living: 0x4f8cff,
  Dining: 0xf0a030,
  Bedroom: 0x9b6bff,
  Study: 0x2fb5a8,
  Kitchen: 0xe0605a,
  Utility: 0x8a9aa8,
  Custom: 0x3fb07a,
}

export const categoryColor = (cat: Category): number => catColors[cat]

/** A piece of furniture placed on the plan. x/y is its centre in plan metres; rot is clockwise degrees (0/90/180/270). */
export interface PlacedItem {
  uid: string
  catalogId: string
  name: string
  w: number
  d: number
  h: number
  category: Category
  x: number
  y: number
  rot: number
  parts?: FurniturePart[]
  /** pinned: can't be dragged, resized, nudged or rotated until unlocked */
  locked?: boolean
}
