/**
 * An agenda budget of 0 is a real amount ("free"): qindom stores and returns 0 and only null/absent
 * means "not set" (user decision I5; keep in sync with qindom `ItinerarySave.service.ts` `agendaColumns`).
 * Use this instead of a truthiness check (`v-if="item.budget"`), which would hide a 0 budget.
 */
export const hasAgendaBudget = (budget: unknown): budget is number =>
  typeof budget === 'number' && Number.isFinite(budget)
