import type { FurniturePart } from './furniture'
import { newPart } from '@/utilities/furniturePartsGeometry'

/**
 * Part models for the built-in catalogue. Each one is built from the piece's own w/d/h so its
 * bounding box is exactly the footprint the planner checks for overlaps (verified in the model
 * test script). The back of a piece is -z (the top of the plan at rotation 0).
 */
type Opts = Partial<FurniturePart>

const WOOD = '#a9753f'
const DARK = '#3d3a45'
const LIGHT = '#ece6da'
const METAL = '#b9c1c9'
const FABRIC = '#c9bfae'

const box = (sx: number, sy: number, sz: number, px: number, py: number, pz: number, o: Opts = {}) =>
  newPart({ shape: 'box', sx, sy, sz, px, py, pz, ...o })
const cyl = (sx: number, sy: number, sz: number, px: number, py: number, pz: number, o: Opts = {}) =>
  newPart({ shape: 'cylinder', sx, sy, sz, px, py, pz, ...o })

/** Four legs inset from the corners of a w x d footprint. */
function legs(w: number, d: number, h: number, inset: number, thick: number, color = WOOD, round = false): FurniturePart[] {
  const out: FurniturePart[] = []
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const px = sx * (w / 2 - inset - thick / 2)
      const pz = sz * (d / 2 - inset - thick / 2)
      out.push(round ? cyl(thick, h, thick, px, 0, pz, { color, taper: 0.7 }) : box(thick, h, thick, px, 0, pz, { color }))
    }
  }
  return out
}

function table(w: number, d: number, h: number, round: boolean): FurniturePart[] {
  const top = 0.04
  const slab = round
    ? cyl(w, top, d, 0, h - top, 0, { color: LIGHT })
    : box(w, top, d, 0, h - top, 0, { color: LIGHT, round: 0.4 })
  return [slab, ...legs(w, d, h - top, 0.05, 0.05, WOOD, round)]
}

function sofa(w: number, d: number, h: number): FurniturePart[] {
  const arm = Math.min(0.2, w * 0.14)
  const back = 0.2
  const foot = 0.1
  return [
    box(w - 2 * arm, 0.28, d - back, 0, foot, back / 2, { round: 0.35, color: FABRIC }),
    box(w, h - foot, back, 0, foot, -(d / 2 - back / 2), { round: 0.4, color: FABRIC }),
    box(arm, h * 0.62 - foot, d, -(w / 2 - arm / 2), foot, 0, { round: 0.5, color: FABRIC }),
    box(arm, h * 0.62 - foot, d, w / 2 - arm / 2, foot, 0, { round: 0.5, color: FABRIC }),
    ...[-1, 1].map((s) => box(0.06, foot, 0.06, s * (w / 2 - 0.1), 0, d / 2 - 0.1, { color: DARK })),
    ...[-1, 1].map((s) => box(0.06, foot, 0.06, s * (w / 2 - 0.1), 0, -d / 2 + 0.1, { color: DARK })),
  ]
}

function sofaL(w: number, d: number, h: number): FurniturePart[] {
  const arm = 0.2
  const back = 0.2
  const foot = 0.1
  const row = 0.95 // depth of the straight run; the chaise runs the full depth
  const chaise = 0.95
  return [
    box(w - arm, 0.28, row - back, arm / 2, foot, -d / 2 + back + (row - back) / 2, { round: 0.35, color: FABRIC }),
    box(chaise, 0.28, d - back, w / 2 - chaise / 2, foot, back / 2, { round: 0.3, color: FABRIC }),
    box(w, h - foot, back, 0, foot, -d / 2 + back / 2, { round: 0.4, color: FABRIC }),
    box(arm, h * 0.62 - foot, row, -(w / 2 - arm / 2), foot, -d / 2 + row / 2, { round: 0.5, color: FABRIC }),
    ...[[-1, -1], [1, -1], [1, 1]].map(([sx, sz]) =>
      box(0.06, foot, 0.06, sx * (w / 2 - 0.1), 0, sz * (d / 2 - 0.1), { color: DARK }),
    ),
  ]
}

function armchair(w: number, d: number, h: number): FurniturePart[] {
  return sofa(w, d, h)
}

function bed(w: number, d: number, h: number, pillows: number): FurniturePart[] {
  const frameTop = 0.26
  const headT = 0.08
  const out = [
    box(w, 0.18, d, 0, 0.08, 0, { color: WOOD, round: 0.15 }),
    box(w - 0.06, h - frameTop, d - headT - 0.05, 0, frameTop, headT / 2, { round: 0.3, color: LIGHT }),
    box(w, h, headT, 0, 0, -d / 2 + headT / 2, { color: WOOD, round: 0.3 }),
    ...legs(w, d, 0.08, 0.02, 0.05, DARK),
  ]
  const pw = pillows > 1 ? (w - 0.3) / 2 : w - 0.3
  for (let i = 0; i < pillows; i++) {
    const px = pillows > 1 ? (i === 0 ? -1 : 1) * (pw / 2 + 0.03) : 0
    out.push(newPart({ shape: 'box', sx: pw, sy: 0.12, sz: 0.35, px, py: h - 0.12, pz: -d / 2 + headT + 0.3, round: 1, color: '#ffffff' }))
  }
  return out
}

function wardrobe(w: number, d: number, h: number): FurniturePart[] {
  const plinth = 0.08
  return [
    box(w, h - plinth, d, 0, plinth, 0, { round: 0.04 }),
    box(w - 0.06, plinth, d - 0.06, 0, 0, 0, { color: DARK }),
    box(0.012, h - plinth - 0.2, 0.01, 0, plinth + 0.1, d / 2 - 0.003, { color: DARK }),
    ...[-1, 1].map((s) => box(0.02, 0.5, 0.03, s * 0.08, h / 2 - 0.1, d / 2 + 0.005 - 0.015, { color: METAL })),
  ].map((p) => (p.pz + p.sz / 2 > d / 2 ? { ...p, pz: p.pz - (p.pz + p.sz / 2 - d / 2) } : p))
}

function bedside(w: number, d: number, h: number): FurniturePart[] {
  return [
    box(w, h - 0.12, d, 0, 0.12, 0, { round: 0.25 }),
    ...legs(w, d, 0.12, 0.03, 0.04, WOOD, true),
    box(w * 0.6, 0.015, 0.01, 0, h * 0.6, d / 2 - 0.005, { color: METAL }),
  ]
}

function desk(w: number, d: number, h: number): FurniturePart[] {
  const top = 0.04
  return [
    box(w, top, d, 0, h - top, 0, { color: LIGHT, round: 0.3 }),
    box(0.04, h - top, d - 0.06, -(w / 2 - 0.05), 0, 0, { color: WOOD }),
    box(0.04, h - top, d - 0.06, w / 2 - 0.05, 0, 0, { color: WOOD }),
    box(w - 0.18, 0.3, 0.02, 0, h - top - 0.3, -d / 2 + 0.05, { color: WOOD }),
  ]
}

function bookshelf(w: number, d: number, h: number): FurniturePart[] {
  const t = 0.03
  const out = [
    box(t, h, d, -(w / 2 - t / 2), 0, 0, { color: WOOD }),
    box(t, h, d, w / 2 - t / 2, 0, 0, { color: WOOD }),
    box(w - 2 * t, h, 0.01, 0, 0, -d / 2 + 0.005, { color: DARK }),
  ]
  const shelves = 5
  for (let i = 0; i < shelves; i++) {
    const y = (i * (h - t)) / (shelves - 1)
    out.push(box(w - 2 * t, t, d - 0.01, 0, y, 0.005, { color: WOOD }))
  }
  return out
}

function fridge(w: number, d: number, h: number): FurniturePart[] {
  const split = h * 0.34
  return [
    box(w, h, d - 0.03, 0, 0, -0.015, { round: 0.12, color: METAL }),
    box(w - 0.02, 0.012, 0.03, 0, split, d / 2 - 0.015, { color: DARK }),
    box(0.025, 0.4, 0.04, w / 2 - 0.1, split + 0.15, d / 2 - 0.02, { color: DARK, round: 1 }),
    box(0.025, 0.25, 0.04, w / 2 - 0.1, split - 0.3, d / 2 - 0.02, { color: DARK, round: 1 }),
  ]
}

function washer(w: number, d: number, h: number): FurniturePart[] {
  return [
    box(w, h, d, 0, 0, 0, { round: 0.1, color: LIGHT }),
    newPart({ shape: 'roll', sx: 0.04, sy: Math.min(w, h) * 0.65, sz: Math.min(w, h) * 0.65, px: 0, py: h * 0.45 - (Math.min(w, h) * 0.65) / 2 + 0.05, pz: d / 2 - 0.02, ry: 90, color: DARK }),
    box(w - 0.1, 0.1, 0.01, 0, h - 0.13, d / 2 - 0.005, { color: DARK }),
  ]
}

function shoe(w: number, d: number, h: number): FurniturePart[] {
  const out = [
    box(w, h - 0.1, d, 0, 0.1, 0, { round: 0.06 }),
    ...legs(w, d, 0.1, 0.03, 0.04, DARK),
  ]
  for (const x of [-1, 1]) out.push(box(0.012, h - 0.25, 0.01, x * (w / 4), 0.18, d / 2 - 0.005, { color: DARK }))
  return out
}

function tvConsole(w: number, d: number, h: number): FurniturePart[] {
  return [
    box(w, h - 0.12, d, 0, 0.12, 0, { round: 0.1 }),
    ...legs(w, d, 0.12, 0.06, 0.04, WOOD, true),
    box(0.012, h - 0.22, 0.01, 0, 0.17, d / 2 - 0.005, { color: DARK }),
  ]
}

const MODELS: Record<string, (w: number, d: number, h: number) => FurniturePart[]> = {
  sofa3: sofa,
  sofaL,
  armchair,
  coffee: (w, d, h) => table(w, d, h, false).map((p) => (p.shape === 'box' && p.sy === 0.04 ? { ...p, round: 0.7 } : p)),
  tvc: tvConsole,
  dine6: (w, d, h) => table(w, d, h, false),
  dine4: (w, d, h) => table(w, d, h, false),
  round: (w, d, h) => [
    cyl(w, 0.04, d, 0, h - 0.04, 0, { color: LIGHT }),
    cyl(0.12, h - 0.1, 0.12, 0, 0.06, 0, { color: WOOD, taper: 0.8 }),
    cyl(w * 0.5, 0.06, d * 0.5, 0, 0, 0, { color: WOOD, taper: 0.6 }),
  ],
  king: (w, d, h) => bed(w, d, h, 2),
  queen: (w, d, h) => bed(w, d, h, 2),
  ssingle: (w, d, h) => bed(w, d, h, 1),
  single: (w, d, h) => bed(w, d, h, 1),
  wardrobe,
  bedside,
  desk,
  bookshelf,
  fridge,
  washer,
  shoe,
}

/** Part model for a built-in catalogue id at the given size, or null when the id has none. */
export function builtinParts(catalogId: string, w: number, d: number, h: number): FurniturePart[] | null {
  return MODELS[catalogId]?.(w, d, h) ?? null
}

/** The model to draw for a piece: its own parts, else the built-in model for its id, else a plain box. */
export function resolveParts(catalogId: string, w: number, d: number, h: number, parts?: FurniturePart[]): FurniturePart[] {
  if (parts?.length) return parts
  return builtinParts(catalogId, w, d, h) ?? [newPart({ sx: w, sy: h, sz: d })]
}
