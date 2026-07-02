/**
 * ÚNICO ponto de escrita em `card_events`. Recebe `tx` (transação Drizzle),
 * NUNCA `db` — o tipo torna impossível emitir evento fora da transação que
 * muta o card (invariante do kanban.md: evento e UPDATE são atômicos).
 */
import { cardEvents, type DB } from "@workspace/db"

/** Transação Drizzle (o parâmetro do callback de db.transaction). */
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0]

/** Payloads canônicos por tipo de evento (v1). `movedBy` fica null até a v2 (auth). */
export type CardEventPayload =
  | { type: "card.created"; payload: { pipeline_id: string; stage_id: string; contact_id: string } }
  | {
      type: "card.stage_changed"
      payload: { from_stage_id: string | null; to_stage_id: string; moved_by: string | null }
    }
  | {
      type: "card.pipeline_changed"
      payload: { from_pipeline_id: string; to_pipeline_id: string; landing_stage_id: string }
    }

/** Grava o evento na MESMA transação da mutação (seq/occurredAt são do banco). */
export async function emitCardEvent(tx: Tx, cardId: string, event: CardEventPayload): Promise<void> {
  await tx.insert(cardEvents).values({ cardId, type: event.type, payload: event.payload })
}
