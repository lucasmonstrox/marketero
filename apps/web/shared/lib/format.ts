import { format, formatDistance } from "date-fns"
import { ptBR } from "date-fns/locale"

import { MOCK_NOW } from "./mock-time"

/**
 * Formatação pt-BR (design-system §8.4). Data `dd/MM/yyyy`, número `1.234,56`,
 * moeda `R$` — tudo via `Intl`/`date-fns` com locale pt-BR. pt-BR é a língua-mãe.
 */

type DateInput = Date | string | number

/** R$ 1.234,56 — recebe o valor em CENTAVOS (padrão do schema `value_cents`). */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100)
}

/** 1.234,56 */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

/** 12,3 mil · 1,2 mi — números grandes compactos. */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(value)
}

/** Recebe a fração (0–1): `0.423` → "42%". */
export function formatPercent(fraction: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(fraction)
}

/** 21/06/2026 */
export function formatDate(date: DateInput): string {
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR })
}

/** 21/06/2026 às 13:45 */
export function formatDateTime(date: DateInput): string {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

/** 13:45 */
export function formatTime(date: DateInput): string {
  return format(new Date(date), "HH:mm", { locale: ptBR })
}

/**
 * "há 5 minutos" · "há 2 dias". Ancorado em MOCK_NOW (não no relógio real):
 * os timestamps de exemplo são determinísticos entre servidor e cliente, o que
 * evita hydration mismatch (React #418) e mantém o "há X" coerente com os mocks.
 * Ao plugar dados reais, trocar MOCK_NOW por `new Date()`.
 */
export function formatRelative(date: DateInput): string {
  return formatDistance(new Date(date), MOCK_NOW, { addSuffix: true, locale: ptBR })
}
