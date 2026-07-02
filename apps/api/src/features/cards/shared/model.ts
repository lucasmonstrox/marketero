/**
 * Contratos TypeBox da feature Cards. `CardResponse` é a saída única;
 * o movimento tem contrato próprio (`MoveBody` → `MoveResponse {card, moved}`).
 * Dinheiro SEMPRE em centavos int.
 */
import { t } from "elysia"

import { ChannelSchema, IntentSchema, PaginationQuery } from "../../../shared/domain/model"

export const CardCreate = t.Object({
  pipelineId: t.String({ format: "uuid" }),
  /** Coluna inicial (opcional — default: a etapa type=new do pipeline). */
  stageId: t.Optional(t.String({ format: "uuid" })),
  contactId: t.String({ format: "uuid" }),
  title: t.String({ minLength: 1, maxLength: 200 }),
  valueCents: t.Optional(t.Integer({ minimum: 0, default: 0 })),
  channel: ChannelSchema,
  intent: t.Optional(t.Union([IntentSchema, t.Null()])),
  tags: t.Optional(t.Array(t.String({ maxLength: 50 }), { maxItems: 20 })),
  assignedTo: t.Optional(t.Union([t.String({ maxLength: 100 }), t.Null()])),
  custom: t.Optional(t.Union([t.Record(t.String(), t.Any()), t.Null()])),
})

/** Update parcial de campos NÃO-posicionais — mover é só via POST /:id/move. */
export const CardUpdate = t.Partial(t.Omit(CardCreate, ["pipelineId", "stageId"]))

export const CardResponse = t.Object({
  id: t.String({ format: "uuid" }),
  pipelineId: t.String({ format: "uuid" }),
  stageId: t.String({ format: "uuid" }),
  contactId: t.String({ format: "uuid" }),
  title: t.String(),
  valueCents: t.Integer(),
  channel: ChannelSchema,
  intent: t.Union([IntentSchema, t.Null()]),
  tags: t.Array(t.String()),
  assignedTo: t.Union([t.String(), t.Null()]),
  enteredStageAt: t.Date(),
  position: t.Integer(),
  custom: t.Union([t.Record(t.String(), t.Any()), t.Null()]),
  createdAt: t.Date(),
  updatedAt: t.Date(),
})

/**
 * Movimento: mesmo pipeline (toStageId) ou cross-pipeline (toPipelineId, com
 * toStageId opcional — sem ele, pousa na etapa type=new do destino).
 * `position` explícita permite soltar o card no meio da coluna (drag & drop).
 */
export const MoveBody = t.Object({
  toStageId: t.Optional(t.String({ format: "uuid" })),
  toPipelineId: t.Optional(t.String({ format: "uuid" })),
  position: t.Optional(t.Integer()),
})

/** `moved:false` = no-op (mesmo stage, sem position) — nenhum evento emitido. */
export const MoveResponse = t.Object({ card: CardResponse, moved: t.Boolean() })

export const CardListQuery = t.Composite([
  t.Object({
    pipelineId: t.Optional(t.String({ format: "uuid" })),
    stageId: t.Optional(t.String({ format: "uuid" })),
    contactId: t.Optional(t.String({ format: "uuid" })),
  }),
  PaginationQuery,
])

export const CardEventResponse = t.Object({
  id: t.String({ format: "uuid" }),
  type: t.String(),
  payload: t.Record(t.String(), t.Any()),
  /** Ordem total (bigserial). Serializado como number (seguro < 2^53). */
  seq: t.Integer(),
  occurredAt: t.Date(),
})

export type CardCreateInput = typeof CardCreate.static
export type CardUpdateInput = typeof CardUpdate.static
export type MoveInput = typeof MoveBody.static
export type CardListQueryInput = typeof CardListQuery.static
