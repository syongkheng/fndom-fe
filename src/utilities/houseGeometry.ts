import type { FloorPlan, Point } from '@/constants/houseplan/floorplan'
import type { PlacedItem } from '@/constants/houseplan/furniture'

export interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

const EPS = 1e-6

/** Axis-aligned footprint of an item; exact because rotation is always a multiple of 90 degrees. */
export function footprint(item: PlacedItem): Rect {
  const swap = item.rot % 180 !== 0
  const hx = (swap ? item.d : item.w) / 2
  const hy = (swap ? item.w : item.d) / 2
  return { x0: item.x - hx, y0: item.y - hy, x1: item.x + hx, y1: item.y + hy }
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
  const rects = items.map(footprint)
  for (let i = 0; i < items.length; i++) {
    if (walls.some((w) => rectsOverlap(rects[i], w))) out.add(items[i].uid)
    for (let j = i + 1; j < items.length; j++) {
      if (rectsOverlap(rects[i], rects[j])) {
        out.add(items[i].uid)
        out.add(items[j].uid)
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
