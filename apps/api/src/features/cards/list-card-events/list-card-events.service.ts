/**
 * GET /cards/:id/events — a timeline do card em ordem causal (ORDER BY seq).
 * Card inexistente é distinto de card sem eventos (404 vs lista vazia).
 */
import { cardEvents, cards, type CardEvent, type DB } from "@workspace/db"
import { asc, eq } from "drizzle-orm"

export type ListCardEventsResult = { ok: true; events: CardEvent[] } | { ok: false; reason: "not_found" }

export async function listCardEvents(
  db: DB,
  cardId: string,
  query: { limit?: number; offset?: number },
): Promise<ListCardEventsResult> {
  const exists = await db.select({ id: cards.id }).from(cards).where(eq(cards.id, cardId))
  if (!exists[0]) return { ok: false, reason: "not_found" }
  const events = await db
    .select()
    .from(cardEvents)
    .where(eq(cardEvents.cardId, cardId))
    .orderBy(asc(cardEvents.seq))
    .limit(query.limit ?? 50)
    .offset(query.offset ?? 0)
  return { ok: true, events }
}
