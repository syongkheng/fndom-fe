import type { FurniturePart, PartShape } from '@/constants/houseplan/furniture'

const MIN_SIZE = 0.01
const MAX_SIZE = 20
const MAX_PARTS = 40

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round3 = (v: number) => Math.round(v * 1000) / 1000
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export const newPart = (over: Partial<FurniturePart> = {}): FurniturePart => ({
  shape: 'box', sx: 0.5, sy: 0.5, sz: 0.5, px: 0, py: 0, pz: 0, ry: 0, round: 0, taper: 1, ...over,
})

export const cloneParts = (parts: FurniturePart[]): FurniturePart[] => parts.map((p) => ({ ...p }))

/** Axis-aligned extent of a part on the plan once rotated (half-extents). */
function planHalfExtents(p: FurniturePart): [number, number] {
  const a = (p.ry * Math.PI) / 180
  const c = Math.abs(Math.cos(a))
  const s = Math.abs(Math.sin(a))
  return [(p.sx * c + p.sz * s) / 2, (p.sx * s + p.sz * c) / 2]
}

export interface PartsBounds {
  x0: number
  x1: number
  z0: number
  z1: number
  y1: number
}

/** Bounding box over all parts (the floor is y = 0). Rounded and curved parts count by their full bounding box. */
export function partsBounds(parts: FurniturePart[]): PartsBounds {
  const b = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, y1: 0 }
  for (const p of parts) {
    const [hx, hz] = planHalfExtents(p)
    b.x0 = Math.min(b.x0, p.px - hx)
    b.x1 = Math.max(b.x1, p.px + hx)
    b.z0 = Math.min(b.z0, p.pz - hz)
    b.z1 = Math.max(b.z1, p.pz + hz)
    b.y1 = Math.max(b.y1, p.py + p.sy)
  }
  return b
}

/** Footprint and height the planner uses for overlap checks, in metres. */
export function partsSize(parts: FurniturePart[]): { w: number; d: number; h: number } {
  if (!parts.length) return { w: 0, d: 0, h: 0 }
  const b = partsBounds(parts)
  return { w: round3(b.x1 - b.x0), d: round3(b.z1 - b.z0), h: round3(b.y1) }
}

/** Re-centres the parts on their footprint and drops them onto the floor, so a model's origin always matches its bounding box. */
export function normalizeParts(parts: FurniturePart[]): FurniturePart[] {
  if (!parts.length) return []
  const b = partsBounds(parts)
  const cx = (b.x0 + b.x1) / 2
  const cz = (b.z0 + b.z1) / 2
  const minY = Math.min(...parts.map((p) => p.py))
  return parts.map((p) => ({ ...p, px: round3(p.px - cx), pz: round3(p.pz - cz), py: round3(p.py - minY) }))
}

const SHAPES = new Set<string>(['box', 'cylinder', 'sphere', 'roll', 'half'])
const HEX = /^#[0-9a-f]{6}$/i

/* eslint-disable @typescript-eslint/no-explicit-any -- parsing untrusted JSON */
export function cleanPart(raw: any): FurniturePart | null {
  if (!raw || typeof raw !== 'object' || !SHAPES.has(raw.shape)) return null
  const { sx, sy, sz, px, py, pz } = raw
  if (![sx, sy, sz, px, py, pz].every(isNum)) return null
  return {
    shape: raw.shape as PartShape,
    sx: clamp(sx, MIN_SIZE, MAX_SIZE),
    sy: clamp(sy, MIN_SIZE, MAX_SIZE),
    sz: clamp(sz, MIN_SIZE, MAX_SIZE),
    px: clamp(px, -MAX_SIZE, MAX_SIZE),
    py: clamp(py, 0, MAX_SIZE),
    pz: clamp(pz, -MAX_SIZE, MAX_SIZE),
    ry: isNum(raw.ry) ? ((raw.ry % 360) + 360) % 360 : 0,
    round: isNum(raw.round) ? clamp(raw.round, 0, 1) : 0,
    taper: isNum(raw.taper) ? clamp(raw.taper, 0.1, 1) : 1,
    ...(typeof raw.color === 'string' && HEX.test(raw.color) ? { color: raw.color.toLowerCase() } : {}),
  }
}

export function cleanParts(raw: any): FurniturePart[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const parts = raw.slice(0, MAX_PARTS).map(cleanPart).filter((p: FurniturePart | null): p is FurniturePart => !!p)
  return parts.length ? parts : undefined
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const MAX_PART_COUNT = MAX_PARTS
