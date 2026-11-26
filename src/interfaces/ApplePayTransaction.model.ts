export interface ApplePayTransaction {
  /** Opaque public identifier (server-generated UUID) — never the DB row's auto-increment id. */
  id: string
  amount: number
  /** ISO 4217 code as reported by the bank alert (e.g. 'SGD', 'CNY'). Never converted — totals are grouped per currency. */
  currency: string
  merchant: string
  /** Apple Pay device/payment label — only ever set on legacy 'v1' (NFC tap) rows. */
  name: string | null
  category?: string
  /** 'v1' = legacy NFC-tap automation (ingestion removed Nov 2026, old rows still listed), 'v2' = bank transaction-alert SMS forwarding, 'manual' = added on the dashboard. */
  source: string
  /** Last 3-4 digits of the card — only ever set on 'v2' rows. */
  cardLast4: string | null
  /** User-assigned nickname for this card_last4 (e.g. "DBS Debit"), shared across every row with the same card_last4. */
  cardLabel: string | null
  occurredDt: number
  createdDt: number
}
