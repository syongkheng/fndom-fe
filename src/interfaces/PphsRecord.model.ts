interface PphsRecord {
  town: string
  address: string
  flatType: Record<'2-room' | '3-room' | '4-room', string>
  siteExpiry: string
  formedUrl: string
  lat: string
  lng: string
  source: 'database'
}

export type { PphsRecord }
