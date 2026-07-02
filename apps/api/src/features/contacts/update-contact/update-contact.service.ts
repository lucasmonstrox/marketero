/**
 * PUT /contacts/:id — atualização parcial. Result object discriminado:
 * a rota mapeia `not_found` → 404 (unique de email/phone → 409 via handler).
 */
import { contacts, type DB } from "@workspace/db"
import { eq } from "drizzle-orm"

import type { ContactUpdateInput } from "../shared/model"

export type UpdateContactResult = { ok: true } | { ok: false; reason: "not_found" }

export async function updateContact(db: DB, id: string, input: ContactUpdateInput): Promise<UpdateContactResult> {
  // Só toca no que veio no body; updatedAt sempre avança.
  const [row] = await db
    .update(contacts)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, id))
    .returning({ id: contacts.id })
  return row ? { ok: true } : { ok: false, reason: "not_found" }
}
