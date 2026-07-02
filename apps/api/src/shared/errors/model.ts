/**
 * Envelope de erro padrão da API — `{ error, detail? }`. Todo response schema
 * de status ≥400 usa este model (contrato único para o front e para o Eden).
 */
import { t } from "elysia"

export const ErrorResponse = t.Object({
  /** Código estável do erro (ex.: "not_found", "wip_limit_exceeded"). */
  error: t.String(),
  /** Contexto humano opcional (nunca dados sensíveis). */
  detail: t.Optional(t.String()),
})
