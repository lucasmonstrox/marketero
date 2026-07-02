/**
 * Wiring da feature STAGES. Sem prefix único: as rotas de coleção são
 * aninhadas no pipeline (/pipelines/:id/stages) e as de item são planas
 * (/stages/:id) — o path expressa o dono. O param aninhado se chama `:id`
 * (não `:pipelineId`) de propósito: o Eden Treaty colapsa params de nomes
 * diferentes no mesmo segmento num union de subárvores, quebrando a
 * inferência de `pipelines({ id }).board` no client.
 */
import { Elysia, t } from "elysia"

import { database } from "../../shared/db"
import { IdParam } from "../../shared/domain/model"
import { ErrorResponse } from "../../shared/errors/model"
import { createStage } from "./create-stage/create-stage.service"
import { deleteStage } from "./delete-stage/delete-stage.service"
import { reorderStages } from "./reorder-stages/reorder-stages.service"
import { DeleteStageQuery, ReorderBody, StageCreate, StageResponse, StageUpdate } from "./shared/model"
import { toStageResponse } from "./shared/serialize"
import { updateStage } from "./update-stage/update-stage.service"

/** Busca a coluna já atualizada para responder o contrato completo. */
async function findStage(db: Parameters<typeof createStage>[0], id: string) {
  return db.query.stages.findFirst({ where: (s, { eq }) => eq(s.id, id) })
}

export const stages = new Elysia({ tags: ["Stages"] })
  .use(database)
  .post(
    "/pipelines/:id/stages",
    async ({ db, params: { id: pipelineId }, body, status }) => {
      const r = await createStage(db, pipelineId, body)
      if (!r.ok && r.reason === "pipeline_not_found") return status(404, { error: "not_found" })
      if (!r.ok) return status(422, { error: r.reason })
      return status(201, toStageResponse((await findStage(db, r.id))!))
    },
    {
      params: IdParam,
      body: StageCreate,
      response: { 201: StageResponse, 404: ErrorResponse, 422: ErrorResponse },
      detail: { summary: "Cria uma coluna no fim do board (só 1 type=new por kanban)" },
    },
  )
  .patch(
    "/pipelines/:id/stages/reorder",
    async ({ db, params: { id: pipelineId }, body, status }) => {
      const r = await reorderStages(db, pipelineId, body.stageIds)
      if (!r.ok && r.reason === "pipeline_not_found") return status(404, { error: "not_found" })
      if (!r.ok) return status(422, { error: r.reason, ...(r.detail ? { detail: r.detail } : {}) })
      const rows = await db.query.stages.findMany({
        where: (s, { eq }) => eq(s.pipelineId, pipelineId),
        orderBy: (s, { asc }) => asc(s.position),
      })
      return rows.map(toStageResponse)
    },
    {
      params: IdParam,
      body: ReorderBody,
      response: { 200: t.Array(StageResponse), 404: ErrorResponse, 422: ErrorResponse },
      detail: { summary: "Reordena as colunas (lista completa de ids na nova ordem)" },
    },
  )
  .put(
    "/stages/:id",
    async ({ db, params: { id }, body, status }) => {
      const r = await updateStage(db, id, body)
      if (!r.ok && r.reason === "not_found") return status(404, { error: "not_found" })
      if (!r.ok) return status(422, { error: r.reason })
      return toStageResponse((await findStage(db, id))!)
    },
    {
      params: IdParam,
      body: StageUpdate,
      response: { 200: StageResponse, 404: ErrorResponse, 422: ErrorResponse },
      detail: { summary: "Ajusta a coluna (nome/type/WIP/acento; position só via reorder)" },
    },
  )
  .delete(
    "/stages/:id",
    async ({ db, params: { id }, query, status }) => {
      const r = await deleteStage(db, id, query.moveCardsTo)
      if (!r.ok && r.reason === "not_found") return status(404, { error: "not_found" })
      if (!r.ok) return status(422, { error: r.reason, ...(r.detail ? { detail: r.detail } : {}) })
      return status(204, undefined)
    },
    {
      params: IdParam,
      query: DeleteStageQuery,
      response: { 204: t.Void(), 404: ErrorResponse, 422: ErrorResponse },
      detail: { summary: "Apaga a coluna (com cards, exige ?moveCardsTo= — migração atômica c/ eventos)" },
    },
  )
