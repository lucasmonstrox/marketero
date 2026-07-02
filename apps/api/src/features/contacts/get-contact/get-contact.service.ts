/**
 * GET /contacts/:id — detalhe. `undefined` = 404 (a rota decide o status;
 * o service não conhece HTTP).
 */
import { contacts, type Contact, type DB } from "@workspace/db"
import { eq } from "drizzle-orm"

export async function getContact(db: DB, id: string): Promise<Contact | undefined> {
  const rows = await db.select().from(contacts).where(eq(contacts.id, id))
  return rows[0]
}
