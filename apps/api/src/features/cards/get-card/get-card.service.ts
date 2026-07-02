/**
 * GET /cards/:id — detalhe. `undefined` = 404 (a rota decide o status).
 */
import { cards, type Card, type DB } from "@workspace/db"
import { eq } from "drizzle-orm"

export async function getCard(db: DB, id: string): Promise<Card | undefined> {
  const rows = await db.select().from(cards).where(eq(cards.id, id))
  return rows[0]
}
