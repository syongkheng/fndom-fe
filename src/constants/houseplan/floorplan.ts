export type Point = [number, number]

export interface Wall {
  /** centre-line segment in plan metres */
  x1: number
  y1: number
  x2: number
  y2: number
  zBottom: number
  zTop: number
  kind: 'wall' | 'door' | 'parapet'
}

export interface DashedLine {
  from: Point
  to: Point
}

export interface RoomLabel {
  id: number
  /** i18n key, e.g. house.rooms.r1 */
  nameKey: string
  pos: Point
}

export interface FloorPlan {
  name: string
  width: number
  depth: number
  wallHeight: number
  doorHeight: number
  wallThickness: number
  walls: Wall[]
  outline: Point[]
  dashed: DashedLine[]
  rooms: RoomLabel[]
  /** where new furniture appears, plan metres */
  spawn: Point
  /** eye-level camera position and target, plan metres */
  eye: { pos: Point; target: Point }
}

const H = 2.6
const DH = 2.1
const PH = 1.0

const W = (x1: number, y1: number, x2: number, y2: number): Wall => ({ x1, y1, x2, y2, zBottom: 0, zTop: H, kind: 'wall' })
const D = (x1: number, y1: number, x2: number, y2: number): Wall => ({ x1, y1, x2, y2, zBottom: DH, zTop: H, kind: 'door' })
const P = (x1: number, y1: number, x2: number, y2: number): Wall => ({ x1, y1, x2, y2, zBottom: 0, zTop: PH, kind: 'parapet' })

/** Vertical extent of a wall of the given kind on this plan. */
export function wallSpan(kind: Wall['kind'], plan: Pick<FloorPlan, 'wallHeight' | 'doorHeight'>): { zBottom: number; zTop: number } {
  if (kind === 'door') return { zBottom: plan.doorHeight, zTop: plan.wallHeight }
  if (kind === 'parapet') return { zBottom: 0, zTop: PH }
  return { zBottom: 0, zTop: plan.wallHeight }
}

export const hdb5Room: FloorPlan = {
  name: 'HDB 5-room',
  width: 15.1,
  depth: 8.95,
  wallHeight: H,
  doorHeight: DH,
  wallThickness: 0.15,
  walls: [
    W(0, 0, 15.1, 0), W(0, 0, 0, 7.7), W(15.1, 0, 15.1, 4.45), W(13.175, 4.45, 15.1, 4.45), W(13.175, 4.45, 13.175, 6.1),
    W(0, 7.7, 1.75, 7.7), W(1.75, 7.7, 2.35, 7.7), D(2.35, 7.7, 3.35, 7.7), W(3.35, 7.7, 4.575, 7.7), // main door
    W(0, 4.9, 1.75, 4.9), W(1.75, 4.9, 1.75, 5.3), D(1.75, 5.3, 1.75, 6.1), W(1.75, 6.1, 1.75, 7.7), // household shelter
    W(4.575, 6.1, 4.575, 8.95), W(4.575, 8.95, 10.18, 8.95), W(10.18, 6.1, 10.18, 8.95), // kitchen / yard shell
    W(8.75, 6.1, 8.75, 7.9), D(8.75, 7.9, 8.75, 8.7), W(8.75, 8.7, 8.75, 8.95), // kitchen <-> service yard door
    W(5.8, 0, 5.8, 3.35), W(8.8, 0, 8.8, 3.35), W(11.8, 0, 11.8, 3.35), // bedroom partitions
    W(5.8, 3.35, 7.9, 3.35), D(7.9, 3.35, 8.8, 3.35), W(8.8, 3.35, 9.0, 3.35), D(9.0, 3.35, 9.9, 3.35), W(9.9, 3.35, 11.8, 3.35),
    D(11.8, 3.35, 11.8, 4.45), // main bedroom door
    W(8.75, 4.45, 9.1, 4.45), D(9.1, 4.45, 9.9, 4.45), W(9.9, 4.45, 11.95, 4.45), D(11.95, 4.45, 12.65, 4.45), W(12.65, 4.45, 13.175, 4.45),
    W(8.75, 4.45, 8.75, 6.1), W(10.925, 4.45, 10.925, 6.1), W(8.75, 6.1, 13.175, 6.1), // bath block
    P(10.4, 7.0, 13.175, 7.0), P(10.4, 6.1, 10.4, 7.0), P(13.175, 6.1, 13.175, 7.0), // air-con ledge parapet
  ],
  outline: [
    [0, 0], [15.1, 0], [15.1, 4.45], [13.175, 4.45], [13.175, 7.0], [10.4, 7.0], [10.4, 6.1],
    [10.18, 6.1], [10.18, 8.95], [4.575, 8.95], [4.575, 7.7], [0, 7.7],
  ],
  dashed: [
    { from: [3.4, 0], to: [3.4, 3.35] },
    { from: [3.4, 3.35], to: [5.8, 3.35] },
    { from: [4.575, 6.1], to: [8.75, 6.1] },
  ],
  rooms: [
    { id: 1, nameKey: 'house.rooms.r1', pos: [2.4, 3.4] },
    { id: 2, nameKey: 'house.rooms.r2', pos: [4.6, 1.7] },
    { id: 3, nameKey: 'house.rooms.r3', pos: [7.3, 1.7] },
    { id: 4, nameKey: 'house.rooms.r4', pos: [10.3, 1.7] },
    { id: 5, nameKey: 'house.rooms.r5', pos: [13.45, 2.2] },
    { id: 6, nameKey: 'house.rooms.r6', pos: [9.85, 5.3] },
    { id: 7, nameKey: 'house.rooms.r7', pos: [12.05, 5.3] },
    { id: 8, nameKey: 'house.rooms.r8', pos: [0.875, 6.3] },
    { id: 9, nameKey: 'house.rooms.r9', pos: [6.65, 7.5] },
    { id: 10, nameKey: 'house.rooms.r10', pos: [9.45, 7.5] },
    { id: 11, nameKey: 'house.rooms.r11', pos: [11.8, 6.55] },
    { id: 12, nameKey: 'house.rooms.r12', pos: [2.85, 7.3] },
  ],
  spawn: [3.0, 2.4],
  eye: { pos: [1.0, 1.0], target: [4.5, 4.5] },
}

/**
 * Floor area of each numbered room (rects as x0, y0, x1, y1 in plan metres) for counting what is in a room.
 * Approximate: the living area also takes the open common space between the bedrooms and the kitchen.
 */
export const hdb5RoomAreas: Record<number, [number, number, number, number][]> = {
  1: [[0, 0, 3.4, 4.9], [1.75, 4.9, 4.575, 7.7], [3.4, 3.35, 8.75, 6.1]],
  2: [[3.4, 0, 5.8, 3.35]],
  3: [[5.8, 0, 8.8, 3.35]],
  4: [[8.8, 0, 11.8, 3.35]],
  5: [[11.8, 0, 15.1, 4.45]],
  6: [[8.75, 4.45, 10.925, 6.1]],
  7: [[10.925, 4.45, 13.175, 6.1]],
  8: [[0, 4.9, 1.75, 7.7]],
  9: [[4.575, 6.1, 8.75, 8.95]],
  10: [[8.75, 6.1, 10.18, 8.95]],
  11: [[10.4, 6.1, 13.175, 7.0]],
}

/** The numbered room a plan point falls in, or null (outside every room area). */
export function roomIdAt(x: number, y: number, areas: Record<number, [number, number, number, number][]> = hdb5RoomAreas): number | null {
  for (const [id, rects] of Object.entries(areas)) {
    if (rects.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1)) return Number(id)
  }
  return null
}

export const floorPlans: Record<string, FloorPlan> = { hdb5Room }
export const activePlan: FloorPlan = hdb5Room
