const BASE = 'https://nominatim.openstreetmap.org'
const HEADERS = {
  'User-Agent': 'Awense/1.0 (com.awense.mobile)',
  'Accept-Language': 'en',
}

export interface Place {
  displayName: string
  shortName: string
  lat: number
  lng: number
  placeId: string
  type?: string
}

export type POICategory = 'Attractions' | 'Restaurants' | 'Hotels' | 'Transport'

function parseResult(r: Record<string, unknown>): Place {
  const parts = (r.display_name as string).split(', ')
  return {
    displayName: r.display_name as string,
    shortName: parts[0],
    lat: parseFloat(r.lat as string),
    lng: parseFloat(r.lon as string),
    placeId: String(r.osm_id ?? r.place_id),
    type: r.type as string | undefined,
  }
}

export async function searchPlaces(query: string): Promise<Place[]> {
  if (!query.trim()) return []
  const url = `${BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=10&addressdetails=0`
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) return []
  const data = (await res.json()) as Record<string, unknown>[]
  return data.map(parseResult)
}

const POI_CATEGORY_MAP: Record<POICategory, string[]> = {
  Attractions: ['attraction', 'museum', 'gallery', 'viewpoint', 'theme_park'],
  Restaurants: ['restaurant', 'cafe', 'fast_food', 'food_court'],
  Hotels: ['hotel', 'hostel', 'guest_house', 'motel'],
  Transport: ['bus_station', 'train_station', 'ferry_terminal', 'airport'],
}

export async function nearbyPOIs(
  lat: number,
  lng: number,
  category: POICategory = 'Attractions',
  radiusKm = 5,
): Promise<Place[]> {
  const amenities = POI_CATEGORY_MAP[category]
  const results: Place[] = []

  for (let i = 0; i < amenities.length; i++) {
    const amenity = amenities[i]
    if (i > 0) await new Promise((r) => setTimeout(r, 300))
    const url =
      `${BASE}/search?format=json&limit=5` +
      `&amenity=${amenity}` +
      `&lat=${lat}&lon=${lng}` +
      `&bounded=1` +
      `&viewbox=${lng - radiusKm / 100},${lat + radiusKm / 100},${lng + radiusKm / 100},${lat - radiusKm / 100}`
    try {
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) continue
      const data = (await res.json()) as Record<string, unknown>[]
      results.push(...data.map(parseResult))
    } catch {
      // ignore individual failures
    }
  }

  return results
}
