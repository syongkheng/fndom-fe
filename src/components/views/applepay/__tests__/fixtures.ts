import type { ApplePayTransaction } from '@/interfaces/ApplePayTransaction.model'

/** Fixed "now" for every test: 20 Nov 2026, 12:00 local time. */
export const NOW = new Date(2026, 10, 20, 12, 0, 0)

export const at = (month: number, day: number, hour = 12, minute = 0) =>
  new Date(2026, month, day, hour, minute).getTime()

let seq = 0
export function tx(partial: Partial<ApplePayTransaction> & { amount: number; occurredDt: number }): ApplePayTransaction {
  seq += 1
  return {
    id: `tx-${seq}`,
    currency: 'SGD',
    merchant: `Merchant ${seq}`,
    name: null,
    source: 'v2',
    cardLast4: null,
    cardLabel: null,
    createdDt: partial.occurredDt,
    ...partial,
  }
}

/** Same formatting the components use (locale-dependent, so compute rather than hardcode). */
export const money = (n: number, currency = 'SGD') => n.toLocaleString(undefined, { style: 'currency', currency })
export const plainNumber = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Server returns newest-first (ORDER BY occurred_dt DESC). */
export const newestFirst = (rows: ApplePayTransaction[]) => rows.slice().sort((a, b) => b.occurredDt - a.occurredDt)
