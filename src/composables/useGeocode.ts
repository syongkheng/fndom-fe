import HttpClient from '@/interceptors/HttpClient'

export interface Place {
  displayName: string
  shortName: string
  lat: number
  lng: number
  placeId: string
  type?: string
  country?: string
}

function parseResult(r: Record<string, unknown>): Place {
  const parts = (r.display_name as string).split(', ')
  const address = r.address as Record<string, unknown> | undefined
  return {
    displayName: r.display_name as string,
    shortName: parts[0],
    lat: parseFloat(r.lat as string),
    lng: parseFloat(r.lon as string),
    placeId: String(r.osm_id ?? r.place_id),
    type: r.type as string | undefined,
    country: address?.country as string | undefined,
  }
}

export async function searchPlaces(query: string): Promise<Place[]> {
  if (!query.trim()) return []
  const res = await HttpClient.get<{ data: Record<string, unknown>[] }>('/geocode', {
    params: { q: query },
  })
  return (res.data.data ?? []).map(parseResult)
}
