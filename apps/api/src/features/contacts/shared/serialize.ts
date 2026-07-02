/**
 * Read-model da feature Contacts: linha do Drizzle → DTO do contrato.
 * Único ponto que conhece as duas formas (schema do banco e response HTTP).
 */
import type { Contact } from "@workspace/db"

/** Achata a linha para o `ContactResponse` (nulls explícitos, datas Date). */
export function toContactResponse(row: Contact) {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
