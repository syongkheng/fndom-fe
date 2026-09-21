export interface ApplePayTransaction {
  /** Opaque public identifier (server-generated UUID) — never the DB row's auto-increment id. */
  id: string
  amount: number
  merchant: string
  name: string
  category?: string
  occurredDt: number
  createdDt: number
}
