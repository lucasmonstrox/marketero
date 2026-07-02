/**
 * Wiring da feature PIPELINES: prefix + 1 rota → 1 função livre. Zero lógica
 * aqui — o controller só mapeia result objects para status HTTP.
 */
import { Elysia, t } from "elysia"

import { database } from "../../shared/db"
import { IdParam } from "../../shared/domain/model"
import { ErrorResponse } from "../../shared/errors/model"
import { createPipeline } from "./create-pipeline/create-pipeline.service"
import { deletePipeline } from "./delete-pipeline/delete-pipeline.service"
import { getBoard } from "./get-board/get-board.service"
import { getPipeline } from "./get-pipeline/get-pipeline.service"
import { listPipelines } from "./list-pipelines/list-pipelines.service"
import { BoardResponse, PipelineCreate, PipelineResponse, PipelineUpdate } from "./shared/model"
import { toBoardCard, toPipelineResponse, toStageResponse } from "./shared/serialize"
import { updatePipeline } from "./update-pipeline/update-pipeline.service"

export const pipelines = new Elysia({ prefix: "/pipelines", tags: ["Pipelines"] })
  .use(database)
  .get("/", async ({ db }) => (await listPipelines(db)).map(toPipelineResponse), {
    response: { 200: t.Array(PipelineResponse) },
    detail: { summary: "Lista os kanbans (default primeiro), com colunas ordenadas" },
  })
  .get(
    "/:id",
    async ({ db, params: { id }, status }) => {
      const row = await getPipeline(db, id)
      return row ? toPipelineResponse(row) : status(404, { error: "not_found" })
    },
    {
      params: IdParam,
      response: { 200: PipelineResponse, 404: ErrorResponse },
      detail: { summary: "Detalha um kanban com suas colunas" },
    },
  )
  .get(
    "/:id/board",
    async ({ db, params: { id }, status }) => {
      const board = await getBoard(db, id)
      if (!board) return status(404, { error: "not_found" })
      return {
        pipeline: { id: board.pipeline.id, name: board.pipeline.name, isDefault: board.pipeline.isDefault },
        stages: board.stages.map((s) => ({ ...toStageResponse(s), cards: s.cards.map(toBoardCard) })),
      }
    },
    {
      params: IdParam,
      response: { 200: BoardResponse, 404: ErrorResponse },
      detail: { summary: "Board completo: colunas + cards agrupados e ordenados" },
    },
  )
  .post(
    "/",
    async ({ db, body, status }) => {
      const r = await createPipeline(db, body)
      if (!r.ok) return status(422, { error: r.reason, detail: r.detail })
      return status(201, toPipelineResponse((await getPipeline(db, r.id))!))
    },
    {
      body: PipelineCreate,
      response: { 201: PipelineResponse, 422: ErrorResponse },
      detail: { summary: "Cria um kanban (colunas iniciais opcionais; exige 1 etapa type=new)" },
    },
  )
  .put(
    "/:id",
    async ({ db, params: { id }, body, status }) => {
      const r = await updatePipeline(db, id, body)
      if (!r.ok) return status(404, { error: "not_found" })
      return toPipelineResponse((await getPipeline(db, id))!)
    },
    {
      params: IdParam,
      body: PipelineUpdate,
      response: { 200: PipelineResponse, 404: ErrorResponse, 422: ErrorResponse },
      detail: { summary: "Renomeia um kanban (isDefault é imutável)" },
    },
  )
  .delete(
    "/:id",
    async ({ db, params: { id }, status }) => {
      const r = await deletePipeline(db, id)
      if (!r.ok && r.reason === "not_found") return status(404, { error: "not_found" })
      if (!r.ok) return status(422, { error: r.reason })
      return status(204, undefined)
    },
    {
      params: IdParam,
      response: { 204: t.Void(), 404: ErrorResponse, 422: ErrorResponse },
      detail: { summary: "Apaga um kanban vazio e não-default (colunas cascateiam)" },
    },
  )
