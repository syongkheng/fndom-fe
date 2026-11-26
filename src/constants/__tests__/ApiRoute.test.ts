import { describe, it, expect } from 'vitest'
import { ApiRoute } from '@/constants/ApiRoute'
import * as Limits from '@/constants/TravelLimits'

describe('ApiRoute — qindom-aligned paths', () => {
  it('itinerary mutations are /:id/update and /:id/delete', () => {
    expect(ApiRoute.ITINERARY.MODIFY('s1')).toBe('/itinerary/s1/update')
    expect(ApiRoute.ITINERARY.DELETE('s1')).toBe('/itinerary/s1/delete')
    expect(ApiRoute.ITINERARY).not.toHaveProperty('ADD_COLLABORATOR')
  })

  it('budget mutations are /:id/update|delete, items /item/:itemId/update, leave is /:id/leave', () => {
    expect(ApiRoute.BUDGET.RENAME('b1')).toBe('/budget/b1/update')
    expect(ApiRoute.BUDGET.DELETE('b1')).toBe('/budget/b1/delete')
    expect(ApiRoute.BUDGET.UPDATE_ITEM('b1', 'i1')).toBe('/budget/b1/item/i1/update')
    expect(ApiRoute.BUDGET.DELETE_ITEM('b1', 'i1')).toBe('/budget/b1/item/i1/delete')
    expect(ApiRoute.BUDGET.REMOVE_COLLABORATOR('b1', 5)).toBe('/budget/b1/collaborator/5/delete')
    expect(ApiRoute.BUDGET.LEAVE('b1')).toBe('/budget/b1/leave')
  })

  it('suggestion deletes are POST /:id/delete', () => {
    expect(ApiRoute.SUGGESTION.DELETE_PACKING(3)).toBe('/suggestion/packing/3/delete')
    expect(ApiRoute.SUGGESTION.DELETE_NOTE(4)).toBe('/suggestion/note/4/delete')
  })

  it('SS key revoke and LTA nearby routes exist', () => {
    expect(ApiRoute.SS_KEY.REVOKE_API_KEY).toBe('/ss-key/api-key/delete')
    expect(ApiRoute.LTA.GET_NEARBY_BUS_STOPS).toBe('/lta/bus-stops/nearby')
    expect(ApiRoute.LTA.GET_NEAREST_MRT_STATIONS).toBe('/lta/mrt-stations/nearest')
  })

  it('removed PPHS / MCP / FILE.CREATE_TG routes are gone', () => {
    expect(ApiRoute).not.toHaveProperty('PPHS')
    expect(ApiRoute).not.toHaveProperty('MCP_KEY')
    expect(ApiRoute.FILE).not.toHaveProperty('CREATE_TG')
  })

  it('no route uses an underscore in a path segment', () => {
    const paths: string[] = []
    const walk = (o: unknown) => {
      for (const v of Object.values(o as Record<string, unknown>)) {
        if (typeof v === 'string') paths.push(v)
        else if (typeof v === 'function') paths.push((v as (...a: string[]) => string)('x', 'y'))
        else if (v && typeof v === 'object') walk(v)
      }
    }
    walk(ApiRoute)
    const relative = paths.filter((p) => p.startsWith('/'))
    expect(relative.length).toBeGreaterThan(0)
    for (const p of relative) expect(p.split('?')[0], p).not.toMatch(/_/)
  })
})

describe('TravelLimits', () => {
  it('match the qindom column widths', () => {
    expect(Limits.TRIP_TITLE_MAX_LENGTH).toBe(512)
    expect(Limits.TRIP_DESTINATION_MAX_LENGTH).toBe(512)
    expect(Limits.AGENDA_TITLE_MAX_LENGTH).toBe(512)
    expect(Limits.BOOKING_ITEM_MAX_LENGTH).toBe(512)
    expect(Limits.BOOKING_REMARKS_MAX_LENGTH).toBe(128)
    expect(Limits.BOOKING_LINK_MAX_LENGTH).toBe(1024)
    expect(Limits.BOOKING_FREE_CANCELLATION_MAX_LENGTH).toBe(256)
    expect(Limits.BOOKING_DEPOSIT_MAX_LENGTH).toBe(128)
    expect(Limits.PACKING_LABEL_MAX_LENGTH).toBe(255)
    expect(Limits.NOTE_LABEL_MAX_LENGTH).toBe(255)
  })

  it('a full-length delayed payment date still fits the 256-char payment column', () => {
    const date = 'x'.repeat(Limits.BOOKING_PAYMENT_DATE_MAX_LENGTH)
    expect(`Delayed (${date})`.length).toBe(256)
  })
})
