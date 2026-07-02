/**
 * DELETE /contacts/:id — apaga a pessoa. Contact com card apontando NÃO é
 * deletável: a FK (sem cascade) barra no engine e o handler global responde
 * 422 fk_violation — proteção que não depende da aplicação lembrar.
 */
import { contacts, type DB } from "@workspace/db"
import { eq } from "drizzle-orm"

export type DeleteContactResult = { ok: true } | { ok: false; reason: "not_found" }

export async function deleteContact(db: DB, id: string): Promise<DeleteContactResult> {
  const [row] = await db.delete(contacts).where(eq(contacts.id, id)).returning({ id: contacts.id })
  return row ? { ok: true } : { ok: false, reason: "not_found" }
}
