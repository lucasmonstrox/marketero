/**
 * `cards` — o NEGÓCIO/oportunidade que anda no funil (o "Deal"). Estado
 * mutável: aponta para a etapa atual; o histórico de movimento vive em
 * `card_events` (imutável). N cards por contact.
 *
 * FKs intencionais: stage sem cascade (deletar coluna com cards exige
 * migração explícita via service); contact sem cascade (apagar pessoa com
 * negócio aberto falha por FK).
 */
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { channel, intent } from "./_enums"
import { id, timestamps } from "./_shared"
import { contacts } from "./contacts"
import { pipelines } from "./pipelines"
import { stages } from "./stages"

export const cards = pgTable(
  "cards",
  {
    /** Identificador único do card (PK). */
    id,
    /** Pipeline atual — desnormalizado do stage p/ filtro/board baratos. */
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => pipelines.id),
    /** Etapa atual. Sem cascade: coluna com cards não some silenciosamente. */
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id),
    /** A pessoa deste negócio. Sem cascade: contact com card não é deletável. */
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    /** Título do card no board (ex.: "Plano anual — Maria"). */
    title: text("title").notNull(),
    /** Valor do negócio em CENTAVOS (int — nunca float p/ dinheiro). */
    valueCents: integer("value_cents").notNull().default(0),
    /** Canal de origem (instagram, whatsapp, web…). */
    channel: channel("channel").notNull(),
    /** Intenção classificada pela IA (opcional até a classificação rodar). */
    intent: intent("intent"),
    /** Etiquetas livres do usuário. */
    tags: text("tags").array().notNull().default([]),
    /** Responsável (id/slug do membro do time — auth real fica pra v2). */
    assignedTo: text("assigned_to"),
    /** Quando o card ENTROU na etapa atual — relógio do "há quanto tempo" (kanban.md). */
    enteredStageAt: timestamp("entered_stage_at", { withTimezone: true }).notNull().defaultNow(),
    /** Ordem dentro da coluna (gaps de 1024; média no meio; reindex quando esgota). */
    position: integer("position").notNull(),
    /** Campos custom livres do tenant (jsonb — sem schema fixo por design). */
    custom: jsonb("custom"),
    ...timestamps,
  },
  (t) => [
    index("cards_stage_position_idx").on(t.stageId, t.position),
    index("cards_pipeline_idx").on(t.pipelineId),
    index("cards_contact_idx").on(t.contactId),
  ],
)

export type Card = typeof cards.$inferSelect
export type NewCard = typeof cards.$inferInsert
