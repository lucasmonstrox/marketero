/**
 * Contratos TypeBox da feature Pipelines. `PipelineResponse` embute as stages
 * (ordenadas por position) — o board (`BoardResponse`) soma os cards por coluna.
 */
import { t } from "elysia"

import { AccentSchema, ChannelSchema, IntentSchema, StageTypeSchema } from "../../../shared/domain/model"

/** Coluna inicial no create (position = índice do array). */
const StageSeed = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  type: StageTypeSchema,
  wipLimit: t.Optional(t.Integer({ minimum: 0, default: 0 })),
  accent: t.Optional(t.Union([AccentSchema, t.Null()])),
})

export const PipelineCreate = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  /** Colunas iniciais (opcional). Se vier, exige EXATAMENTE 1 type=new. */
  stages: t.Optional(t.Array(StageSeed, { maxItems: 30 })),
})

export const PipelineUpdate = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
})

export const StageResponse = t.Object({
  id: t.String({ format: "uuid" }),
  pipelineId: t.String({ format: "uuid" }),
  name: t.String(),
  position: t.Integer(),
  type: StageTypeSchema,
  wipLimit: t.Integer(),
  accent: t.Union([AccentSchema, t.Null()]),
  createdAt: t.Date(),
  updatedAt: t.Date(),
})

export const PipelineResponse = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  isDefault: t.Boolean(),
  stages: t.Array(StageResponse),
  createdAt: t.Date(),
  updatedAt: t.Date(),
})

/** Card resumido no board (o contrato completo vive na feature cards). */
export const BoardCard = t.Object({
  id: t.String({ format: "uuid" }),
  contactId: t.String({ format: "uuid" }),
  title: t.String(),
  valueCents: t.Integer(),
  channel: ChannelSchema,
  intent: t.Union([IntentSchema, t.Null()]),
  tags: t.Array(t.String()),
  assignedTo: t.Union([t.String(), t.Null()]),
  enteredStageAt: t.Date(),
  position: t.Integer(),
})

export const BoardResponse = t.Object({
  pipeline: t.Object({ id: t.String({ format: "uuid" }), name: t.String(), isDefault: t.Boolean() }),
  stages: t.Array(t.Composite([StageResponse, t.Object({ cards: t.Array(BoardCard) })])),
})

export type PipelineCreateInput = typeof PipelineCreate.static
export type PipelineUpdateInput = typeof PipelineUpdate.static
