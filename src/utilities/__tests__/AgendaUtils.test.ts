import { describe, it, expect } from 'vitest'
import { hasAgendaBudget } from '../AgendaUtils'

describe('hasAgendaBudget (I5: 0 is a real amount)', () => {
  it('shows a 0 budget and any other number', () => {
    expect(hasAgendaBudget(0)).toBe(true)
    expect(hasAgendaBudget(12.5)).toBe(true)
  })

  it('hides a budget that is not set', () => {
    expect(hasAgendaBudget(null)).toBe(false)
    expect(hasAgendaBudget(undefined)).toBe(false)
    expect(hasAgendaBudget(Number.NaN)).toBe(false)
    expect(hasAgendaBudget('')).toBe(false)
  })

  it('treats -0 as a real 0', () => {
    expect(hasAgendaBudget(-0)).toBe(true)
  })

  it('rejects non-finite numbers', () => {
    expect(hasAgendaBudget(Number.POSITIVE_INFINITY)).toBe(false)
    expect(hasAgendaBudget(Number.NEGATIVE_INFINITY)).toBe(false)
  })

  it('rejects numeric strings and other non-number types (no coercion)', () => {
    expect(hasAgendaBudget('0')).toBe(false)
    expect(hasAgendaBudget('25')).toBe(false)
    expect(hasAgendaBudget(false)).toBe(false)
    expect(hasAgendaBudget({})).toBe(false)
    expect(hasAgendaBudget([])).toBe(false)
  })
})
