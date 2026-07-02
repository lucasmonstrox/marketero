/**
 * Tratamento de erros global. Mapeia erros do Elysia (validação/rota) e
 * SQLSTATE do Postgres (node-postgres expõe `error.code`) para respostas HTTP
 * limpas. Loga o erro completo no servidor e responde enxuto ao cliente.
 * Usa `status()` (o `error()` foi removido no Elysia 1.4).
 *
 * Erros de NEGÓCIO não passam por aqui: services retornam result objects
 * discriminados e a rota mapeia o status — exceptions são só o inesperado.
 */
import { Elysia } from "elysia"

/** node-postgres anexa `code` (SQLSTATE) + `constraint`/`detail` ao erro. */
function isPgError(e: unknown): e is { code: string; constraint?: string; detail?: string } {
  return typeof e === "object" && e !== null && "code" in e && typeof (e as { code: unknown }).code === "string"
}

export const errors = new Elysia({ name: "plugin.errors" }).onError({ as: "global" }, ({ code, error, status }) => {
  // Erros nativos do Elysia
  if (code === "VALIDATION") return status(422, { error: "validation", detail: String((error as Error).message) })
  if (code === "NOT_FOUND") return status(404, { error: "not_found" })

  // SQLSTATE do Postgres (classe 23 = integrity_constraint_violation, etc.)
  if (isPgError(error)) {
    switch (error.code) {
      case "23505": // unique_violation
        return status(409, { error: "conflict", detail: error.constraint })
      case "23503": // foreign_key_violation
        return status(422, { error: "fk_violation", detail: error.constraint })
      case "23502": // not_null_violation
        return status(422, { error: "not_null", detail: error.detail })
      case "23514": // check_violation
        return status(422, { error: "check_violation", detail: error.constraint })
      case "22P02": // invalid_text_representation (uuid/enum malformado)
        return status(400, { error: "invalid_input" })
      case "40001": // serialization_failure
      case "40P01": // deadlock_detected
        return status(409, { error: "conflict_retry" })
    }
  }

  console.error("[api] erro não tratado:", error)
  return status(500, { error: "internal" })
})
