export interface ApplePayTransaction {
  /** Opaque public identifier (server-generated UUID) — never the DB row's auto-increment id. */
  id: string
  amount: number
  merchant: string
  /** Apple Pay device/payment label — only ever set on 'v1' (NFC tap) rows. */
  name: string | null
  category?: string
  /** 'v1' = NFC-tap automation, 'v2' = bank transaction-alert email forwarding. */
  source: string
  /** Last 3-4 digits of the card — only ever set on 'v2' rows. */
  cardLast4: string | null
  occurredDt: number
  createdDt: number
}
