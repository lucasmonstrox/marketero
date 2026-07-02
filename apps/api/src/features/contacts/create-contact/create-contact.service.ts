/**
 * POST /contacts — cria a pessoa. Unicidade de email/phone fica no engine
 * (unique) e sobe como 409 via error handler global; aqui não há regra extra.
 */
import { contacts, type DB } from "@workspace/db"

import type { ContactCreateInput } from "../shared/model"

export async function createContact(db: DB, input: ContactCreateInput): Promise<{ id: string }> {
  // Insert direto: o shape já foi validado no boundary (TypeBox da rota).
  const [row] = await db
    .insert(contacts)
    .values({ name: input.name.trim(), email: input.email ?? null, phone: input.phone ?? null })
    .returning({ id: contacts.id })
  return { id: row!.id }
}
