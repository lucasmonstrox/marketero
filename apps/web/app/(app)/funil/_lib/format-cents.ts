import currency from "currency.js"

/**
 * Dinheiro em input de formulário, padrão pt-BR ("1.234,56"). A fonte de
 * verdade é SEMPRE centavos int (schema `value_cents`) — currency.js cuida do
 * arredondamento sem float drift.
 */

const BRL = { separator: ".", decimal: ",", symbol: "R$ ", precision: 2 }

/** "1.234,56" | "1234,56" | "1234.56" → 123456 (centavos). Inválido → null. */
export function parseCentsInput(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const value = currency(trimmed, BRL)
  if (Number.isNaN(value.value) || value.value < 0) return null
  return value.intValue
}

/** 123456 → "1.234,56" (sem símbolo — para preencher inputs). */
export function centsToInput(cents: number): string {
  if (!cents) return ""
  return currency(cents, { ...BRL, fromCents: true, symbol: "" }).format()
}
