import { parseISO, subDays, subHours, subMinutes } from "date-fns"

/**
 * Tempo dos dados de exemplo. Tudo que é data passa por date-fns: a âncora é
 * parseada com `parseISO` e os deslocamentos relativos usam `subMinutes`/
 * `subHours`/`subDays` (nunca aritmética de milissegundos crua). A âncora é
 * FIXA para manter os timestamps determinísticos entre servidor e cliente
 * (SSR estável, sem hydration mismatch). Retorna ISO string pronta para os
 * formatadores pt-BR de `@/shared/lib/format`.
 */

/** "Agora" de referência dos mocks — 21/06/2026, fim de tarde (America/Sao_Paulo). */
export const MOCK_NOW = parseISO("2026-06-21T18:00:00-03:00")

export const minutesAgo = (minutes: number): string =>
  subMinutes(MOCK_NOW, minutes).toISOString()

export const hoursAgo = (hours: number): string =>
  subHours(MOCK_NOW, hours).toISOString()

export const daysAgo = (days: number): string =>
  subDays(MOCK_NOW, days).toISOString()
