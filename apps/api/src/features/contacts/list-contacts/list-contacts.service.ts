/**
 * GET /contacts — lista com busca livre (`q` casa nome/email/telefone,
 * case-insensitive) e paginação. Ordena por criação (mais novos primeiro).
 */
import { contacts, type Contact, type DB } from "@workspace/db"
import { desc, ilike, or } from "drizzle-orm"

import type { ContactListQueryInput } from "../shared/model"

export async function listContacts(db: DB, query: ContactListQueryInput): Promise<Contact[]> {
  // Filtro opcional: um só `q` cobre os três campos de identidade.
  const filter = query.q
    ? or(ilike(contacts.name, `%${query.q}%`), ilike(contacts.email, `%${query.q}%`), ilike(contacts.phone, `%${query.q}%`))
    : undefined
  return db
    .select()
    .from(contacts)
    .where(filter)
    .orderBy(desc(contacts.createdAt))
    .limit(query.limit ?? 50)
    .offset(query.offset ?? 0)
}
