/**
 * `card_events` — histórico APPEND-ONLY do card (nunca UPDATE/DELETE em linha).
 * Todo movimento emite o evento canônico NA MESMA TRANSAÇÃO do UPDATE do card
 * (invariante do kanban.md) — é daqui que as automações da v2 vão beber.
 */
import { bigserial, index, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"

import { cardEventType } from "./_enums"
import { cards } from "./cards"

export const cardEvents = pgTable(
  "card_events",
  {
    /** Identificador único do evento (PK). */
    id: uuid("id").primaryKey().defaultRandom(),
    /** Card do evento — deletar o card leva o histórico junto. */
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    /** Tipo canônico (card.created | card.stage_changed | card.pipeline_changed). */
    type: cardEventType("type").notNull(),
    /** Corpo do evento (ex.: { from_stage_id, to_stage_id, moved_by }). */
    payload: jsonb("payload").notNull(),
    /** Ordem TOTAL de eventos (bigserial global) — timeline = ORDER BY seq. */
    seq: bigserial("seq", { mode: "bigint" }).notNull(),
    /** Quando o fato aconteceu (mesma transação da mutação do card). */
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("card_events_card_seq_idx").on(t.cardId, t.seq)],
)

export type CardEvent = typeof cardEvents.$inferSelect
export type NewCardEvent = typeof cardEvents.$inferInsert
