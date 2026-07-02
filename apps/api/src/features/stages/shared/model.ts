/**
 * Contratos TypeBox da feature Stages (colunas do kanban).
 */
import { t } from "elysia"

import { AccentSchema, StageTypeSchema } from "../../../shared/domain/model"

export const StageCreate = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  type: StageTypeSchema,
  wipLimit: t.Optional(t.Integer({ minimum: 0, default: 0 })),
  accent: t.Optional(t.Union([AccentSchema, t.Null()])),
})

/** Update parcial: nome, papel, WIP e acento (position só via reorder). */
export const StageUpdate = t.Partial(StageCreate)

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

/** Reorder recebe a lista COMPLETA de ids na nova ordem (permutação). */
export const ReorderBody = t.Object({
  stageIds: t.Array(t.String({ format: "uuid" }), { minItems: 1, maxItems: 50 }),
})

/** DELETE /stages/:id?moveCardsTo= — destino dos cards órfãos. */
export const DeleteStageQuery = t.Object({
  moveCardsTo: t.Optional(t.String({ format: "uuid" })),
})

export type StageCreateInput = typeof StageCreate.static
export type StageUpdateInput = typeof StageUpdate.static
