import type { FloorPlan, Point, Wall } from '@/constants/houseplan/floorplan'
import type { PlacedItem } from '@/constants/houseplan/furniture'

export interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

const EPS = 1e-6

/** True for 0 / 90 / 180 / 270 (and their multiples): the piece's edges stay on the plan axes. */
export const isQuarterTurn = (rot: number) => Math.abs(rot % 90) < 1e-9

/** Width and depth as drawn on the plan: swapped at 90/270; a piece turned to any other angle keeps its own width/depth. */
export function planSize(item: Pick<PlacedItem, 'w' | 'd' | 'rot'>): { x: number; y: number } {
  const swap = isQuarterTurn(item.rot) && item.rot % 180 !== 0
  return { x: swap ? item.d : item.w, y: swap ? item.w : item.d }
}

/**
 * Axis-aligned box around an item: exact for quarter turns, the bounding box of the rotated rectangle otherwise
 * (snapping, handles and labels use it; overlap checks use the real rotated outline, see `itemPolygon`).
 */
export function footprint(item: PlacedItem): Rect {
  if (isQuarterTurn(item.rot)) {
    const { x, y } = planSize(item)
    return { x0: item.x - x / 2, y0: item.y - y / 2, x1: item.x + x / 2, y1: item.y + y / 2 }
  }
  const a = (item.rot * Math.PI) / 180
  const c = Math.abs(Math.cos(a))
  const s = Math.abs(Math.sin(a))
  const hx = (item.w * c + item.d * s) / 2
  const hy = (item.w * s + item.d * c) / 2
  return { x0: item.x - hx, y0: item.y - hy, x1: item.x + hx, y1: item.y + hy }
}

/** The four corners of the (possibly rotated) piece, turned clockwise on the plan. */
export function itemPolygon(item: PlacedItem): Point[] {
  const a = (item.rot * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as Point[]).map(([sx, sy]) => {
    const lx = (sx * item.w) / 2
    const ly = (sy * item.d) / 2
    return [item.x + lx * c - ly * s, item.y + lx * s + ly * c]
  })
}

const rectPolygon = (r: Rect): Point[] => [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]]

/** Separating-axis test for two convex polygons; edges that only touch do not overlap. */
function polygonsOverlap(a: Point[], b: Point[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]
      const q = poly[(i + 1) % poly.length]
      const nx = q[1] - p[1]
      const ny = p[0] - q[0]
      const len = Math.hypot(nx, ny) || 1
      let min1 = Infinity
      let max1 = -Infinity
      let min2 = Infinity
      let max2 = -Infinity
      for (const v of a) {
        const d = (v[0] * nx + v[1] * ny) / len
        min1 = Math.min(min1, d)
        max1 = Math.max(max1, d)
      }
      for (const v of b) {
        const d = (v[0] * nx + v[1] * ny) / len
        min2 = Math.min(min2, d)
        max2 = Math.max(max2, d)
      }
      if (max1 <= min2 + EPS || max2 <= min1 + EPS) return false
    }
  }
  return true
}

/** Whether two pieces overlap, using their real outlines (quarter-turn pairs take the exact, cheaper box test). */
export function itemsOverlap(a: PlacedItem, b: PlacedItem): boolean {
  if (isQuarterTurn(a.rot) && isQuarterTurn(b.rot)) return rectsOverlap(footprint(a), footprint(b))
  return rectsOverlap(footprint(a), footprint(b)) && polygonsOverlap(itemPolygon(a), itemPolygon(b))
}

/** Whether a piece overlaps a wall box. */
export function itemHitsRect(item: PlacedItem, r: Rect): boolean {
  if (isQuarterTurn(item.rot)) return rectsOverlap(footprint(item), r)
  return rectsOverlap(footprint(item), r) && polygonsOverlap(itemPolygon(item), rectPolygon(r))
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 - EPS && a.x1 > b.x0 + EPS && a.y0 < b.y1 - EPS && a.y1 > b.y0 + EPS
}

/** Wall footprints with thickness. Door headers are skipped so openings stay passable. */
export function wallRects(plan: FloorPlan): Rect[] {
  const t = plan.wallThickness / 2
  return plan.walls
    .filter((w) => w.kind !== 'door')
    .map((w) => ({
      x0: Math.min(w.x1, w.x2) - t,
      y0: Math.min(w.y1, w.y2) - t,
      x1: Math.max(w.x1, w.x2) + t,
      y1: Math.max(w.y1, w.y2) + t,
    }))
}

export function findConflicts(items: PlacedItem[], walls: Rect[]): Set<string> {
  const out = new Set<string>()
  for (let i = 0; i < items.length; i++) {
    if (walls.some((w) => itemHitsRect(items[i], w))) out.add(items[i].uid)
    for (let j = i + 1; j < items.length; j++) {
      if (itemsOverlap(items[i], items[j])) {
        out.add(items[i].uid)
        out.add(items[j].uid)
      }
    }
  }
  return out
}

/**
 * Shift that sets a candidate footprint flush against the face of any obstacle (wall or other piece) it is within
 * `thr` metres of. Only obstacles the footprint actually runs alongside count (their spans overlap), so something
 * further down the plan never pulls a piece sideways. `alignTo` (other pieces) also lets a matching edge line up
 * with the candidate's, e.g. a bedside table's back with the bed's. Each axis moves by the smallest such shift, or 0.
 */
export function snapFlush(r: Rect, obstacles: Rect[], thr = 0.15, alignTo: Rect[] = []): { dx: number; dy: number } {
  let dx = 0
  let dy = 0
  let bx = thr
  let by = thr
  const take = (s: number, axis: 'x' | 'y') => {
    if (axis === 'x' && Math.abs(s) < bx) {
      bx = Math.abs(s)
      dx = s
    } else if (axis === 'y' && Math.abs(s) < by) {
      by = Math.abs(s)
      dy = s
    }
  }
  for (const w of obstacles) {
    if (r.y0 < w.y1 && r.y1 > w.y0) {
      take(w.x0 - r.x1, 'x')
      take(w.x1 - r.x0, 'x')
    }
    if (r.x0 < w.x1 && r.x1 > w.x0) {
      take(w.y0 - r.y1, 'y')
      take(w.y1 - r.y0, 'y')
    }
  }
  for (const o of alignTo) {
    // only pieces the candidate is touching (or about to touch) side by side count
    const touchX = r.x0 < o.x1 + thr && r.x1 > o.x0 - thr
    const touchY = r.y0 < o.y1 + thr && r.y1 > o.y0 - thr
    if (touchX && r.y0 < o.y1 && r.y1 > o.y0) {
      take(o.y0 - r.y0, 'y')
      take(o.y1 - r.y1, 'y')
    }
    if (touchY && r.x0 < o.x1 && r.x1 > o.x0) {
      take(o.x0 - r.x0, 'x')
      take(o.x1 - r.x1, 'x')
    }
  }
  return { dx, dy }
}

/** Snaps one moving edge (coordinate v on `axis`) to a nearby wall or piece face, considering only obstacles beside the span lo..hi on the other axis. */
export function snapEdge(v: number, axis: 'x' | 'y', lo: number, hi: number, walls: Rect[], thr = 0.12): number {
  let best = thr
  let out = v
  for (const w of walls) {
    const [a0, a1, f0, f1] = axis === 'x' ? [w.y0, w.y1, w.x0, w.x1] : [w.x0, w.x1, w.y0, w.y1]
    if (!(lo < a1 && hi > a0)) continue
    for (const f of [f0, f1]) {
      if (Math.abs(f - v) < best) {
        best = Math.abs(f - v)
        out = f
      }
    }
  }
  return out
}

export function itemCorners(item: PlacedItem): Point[] {
  const r = footprint(item)
  return [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]]
}

/** Fixed points the measure tool can snap to: wall end points and floor outline vertices. */
export function planSnapPoints(plan: FloorPlan): Point[] {
  const pts: Point[] = [...plan.outline]
  for (const w of plan.walls) {
    pts.push([w.x1, w.y1], [w.x2, w.y2])
  }
  return pts
}

// ---- clearance -----------------------------------------------------------
export type ClearanceIssue = 'tight' | 'door'

/** Clear walkway wanted in front of pieces you open or stand at. */
export const CLEARANCE_M = 0.6
/** How far either side of a doorway must stay open. */
const DOOR_PAD = 0.45
/** Pieces with a front you need access to: doors that swing, drawers, a fridge to stand at. */
const ACCESS_IDS = new Set(['wardrobe', 'fitted_wardrobe', 'shoe', 'fridge', 'washer'])

/** The strip in front of a piece (back to the north wall at rotation 0, so the front faces south), `CLEARANCE_M` deep. */
export function frontZone(item: PlacedItem): Rect | null {
  if (!isQuarterTurn(item.rot)) return null // a piece turned to a free angle has no straight "front" strip to check
  const f = footprint(item)
  const c = CLEARANCE_M
  switch (((item.rot % 360) + 360) % 360) {
    case 90: return { x0: f.x0 - c, y0: f.y0, x1: f.x0, y1: f.y1 } // back east, front west
    case 180: return { x0: f.x0, y0: f.y0 - c, x1: f.x1, y1: f.y0 }
    case 270: return { x0: f.x1, y0: f.y0, x1: f.x1 + c, y1: f.y1 }
    default: return { x0: f.x0, y0: f.y1, x1: f.x1, y1: f.y1 + c }
  }
}

/** Each doorway with DOOR_PAD of open floor on both sides of the wall. */
export function doorZones(walls: Wall[], thickness: number): Rect[] {
  const t = thickness / 2
  return walls
    .filter((w) => w.kind === 'door')
    .map((w) => {
      const horizontal = w.y1 === w.y2
      const padX = horizontal ? 0 : DOOR_PAD
      const padY = horizontal ? DOOR_PAD : 0
      return {
        x0: Math.min(w.x1, w.x2) - t - padX,
        y0: Math.min(w.y1, w.y2) - t - padY,
        x1: Math.max(w.x1, w.x2) + t + padX,
        y1: Math.max(w.y1, w.y2) + t + padY,
      }
    })
}

/**
 * Pieces that are not overlapping anything but still make the home awkward: a storage piece with an obstacle
 * inside its front walkway ('tight'), or anything standing in a doorway ('door').
 */
export function clearanceIssues(items: PlacedItem[], walls: Wall[], thickness: number): Map<string, ClearanceIssue[]> {
  const out = new Map<string, ClearanceIssue[]>()
  const solid = wallRects({ walls, wallThickness: thickness } as FloorPlan)
  const doors = doorZones(walls, thickness)
  const rects = items.map(footprint)
  items.forEach((it, i) => {
    const issues: ClearanceIssue[] = []
    const z = ACCESS_IDS.has(it.catalogId) ? frontZone(it) : null
    if (z && (solid.some((w) => rectsOverlap(z, w)) || rects.some((r, j) => j !== i && rectsOverlap(z, r)))) issues.push('tight')
    if (doors.some((d) => rectsOverlap(rects[i], d))) issues.push('door')
    if (issues.length) out.set(it.uid, issues)
  })
  return out
}

// ---- distance guides -------------------------------------------------------
export interface Gap {
  from: Point
  to: Point
  cm: number
}

/**
 * The open distance from each side of a footprint to the nearest wall or piece straight out from it (their spans overlap),
 * as a line across the gap. Flush neighbours (under 1 cm) and anything further than `maxM` are left out.
 */
export function nearestGaps(r: Rect, obstacles: Rect[], maxM = 4): Gap[] {
  const out: Gap[] = []
  const side = (horizontal: boolean, towardsMax: boolean) => {
    let best: { gap: number; edge: number; across: number } | null = null
    for (const o of obstacles) {
      const lo = horizontal ? Math.max(r.y0, o.y0) : Math.max(r.x0, o.x0)
      const hi = horizontal ? Math.min(r.y1, o.y1) : Math.min(r.x1, o.x1)
      if (hi - lo <= EPS) continue
      const [from, to] = horizontal
        ? (towardsMax ? [r.x1, o.x0] : [r.x0, o.x1])
        : (towardsMax ? [r.y1, o.y0] : [r.y0, o.y1])
      const gap = towardsMax ? to - from : from - to
      if (gap < 0.01 || gap > maxM) continue
      if (!best || gap < best.gap) best = { gap, edge: from, across: (lo + hi) / 2 }
    }
    if (!best) return
    const end = towardsMax ? best.edge + best.gap : best.edge - best.gap
    out.push({
      from: horizontal ? [best.edge, best.across] : [best.across, best.edge],
      to: horizontal ? [end, best.across] : [best.across, end],
      cm: Math.round(best.gap * 100),
    })
  }
  side(true, false)
  side(true, true)
  side(false, false)
  side(false, true)
  return out
}
