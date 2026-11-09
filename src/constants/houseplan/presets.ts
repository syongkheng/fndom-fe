import { catalogue, type PlacedItem } from './furniture'

let n = 0

/** A catalogue piece at plan metres (x, y = centre), rot clockwise degrees: 0 back to north wall, 90 east, 180 south, 270 west. */
function p(catalogId: string, x: number, y: number, rot = 0): PlacedItem {
  const src = catalogue.find((c) => c.id === catalogId)
  if (!src) throw new Error(`unknown catalogue id ${catalogId}`)
  return { uid: `preset-${++n}`, catalogId, name: src.name, w: src.w, d: src.d, h: src.h, category: src.category, x, y, rot }
}

/** Furnished HDB 5-room for two: main bedroom, gaming room, closet room, study nook, living/dining. */
export const couplesHome: { version: 1; plan: string; items: PlacedItem[]; custom: [] } = {
  version: 1,
  plan: 'HDB 5-room',
  custom: [],
  items: [
    // Main bedroom
    p('king', 14.05, 1.8, 90),
    p('bedside', 14.8, 0.45, 90),
    p('bedside', 14.8, 3.0, 90),
    p('wardrobe', 12.2, 2.35, 270),
    // Bedroom 2 - gaming room
    p('desk', 9.55, 0.4, 0),
    p('desk', 10.85, 0.4, 0),
    p('armchair', 9.55, 1.3, 0),
    p('armchair', 10.85, 1.3, 0),
    p('bookshelf', 11.55, 1.8, 90),
    // Bedroom 3 - closet / dressing room
    p('wardrobe', 6.8, 0.4, 0),
    p('wardrobe', 6.2, 2.3, 270),
    p('wardrobe', 8.4, 1.9, 90),
    // Study nook
    p('desk', 4.6, 0.4, 0),
    p('bookshelf', 5.55, 2.0, 90),
    // Living / dining
    p('tvc', 0.3, 2.4, 270),
    p('sofaL', 2.6, 2.4, 90),
    p('coffee', 1.2, 2.4, 90),
    p('dine6', 3.4, 5.8, 0),
    // Entry, kitchen, yard
    p('shoe', 3.95, 7.45, 180),
    p('fridge', 5.05, 6.5, 0),
    p('washer', 9.6, 8.55, 180),
  ],
}
