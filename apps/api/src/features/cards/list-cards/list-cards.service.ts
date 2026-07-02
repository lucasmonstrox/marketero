/**
 * GET /cards — lista com filtros compostos (pipeline/stage/contact) e
 * paginação. Ordena por coluna e posição (a mesma ordem do board).
 */
import { cards, type Card, type DB } from "@workspace/db"
import { and, asc, eq } from "drizzle-orm"

import type { CardListQueryInput } from "../shared/model"

export async function listCards(db: DB, query: CardListQueryInput): Promise<Card[]> {
  // Filtros opcionais combinados por AND (undefined é ignorado pelo and()).
  const filter = and(
    query.pipelineId ? eq(cards.pipelineId, query.pipelineId) : undefined,
    query.stageId ? eq(cards.stageId, query.stageId) : undefined,
    query.contactId ? eq(cards.contactId, query.contactId) : undefined,
  )
  return db
    .select()
    .from(cards)
    .where(filter)
    .orderBy(asc(cards.stageId), asc(cards.position))
    .limit(query.limit ?? 50)
    .offset(query.offset ?? 0)
}
