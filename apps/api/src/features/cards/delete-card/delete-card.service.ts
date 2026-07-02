/**
 * DELETE /cards/:id — apaga o negócio; a timeline (card_events) cascateia.
 */
import { cards, type DB } from "@workspace/db"
import { eq } from "drizzle-orm"

export type DeleteCardResult = { ok: true } | { ok: false; reason: "not_found" }

export async function deleteCard(db: DB, id: string): Promise<DeleteCardResult> {
  const [row] = await db.delete(cards).where(eq(cards.id, id)).returning({ id: cards.id })
  return row ? { ok: true } : { ok: false, reason: "not_found" }
}
