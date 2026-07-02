/** Integração — PUT /stages/:id (proteções do type + WIP não expulsa). */
import { beforeEach, describe, expect, test } from "bun:test"

import { expectError, json, makeCard, makePipeline, request, resetDb } from "../../../shared/testing/harness"

describe("PUT /stages/:id", () => {
  beforeEach(resetDb)

  test("renomeia e ajusta wipLimit/accent", async () => {
    const p = await makePipeline()
    const body = await json<{ name: string; wipLimit: number; accent: unknown }>(
      await request("PUT", `/stages/${p.stageIds[1]}`, {
        name: "Em conversa",
        wipLimit: 3,
        accent: { kind: "chart", n: 2 },
      }),
    )
    expect(body.name).toBe("Em conversa")
    expect(body.wipLimit).toBe(3)
    expect(body.accent).toEqual({ kind: "chart", n: 2 })
  })

  test("mudar type do ÚNICO new → 422 last_new_stage", async () => {
    const p = await makePipeline()
    await expectError(await request("PUT", `/stages/${p.stageIds[0]}`, { type: "active" }), 422, "last_new_stage")
  })

  test("mudar type PARA new com new existente → 422 duplicate_new_stage", async () => {
    const p = await makePipeline()
    await expectError(await request("PUT", `/stages/${p.stageIds[1]}`, { type: "new" }), 422, "duplicate_new_stage")
  })

  test("reduzir wipLimit abaixo do count atual NÃO expulsa — só bloqueia a próxima entrada", async () => {
    const p = await makePipeline()
    const stage = p.stageIds[1]!
    await makeCard({ pipelineId: p.id, stageId: stage })
    await makeCard({ pipelineId: p.id, stageId: stage })
    // reduz para 1 com 2 dentro: aceito
    expect((await request("PUT", `/stages/${stage}`, { wipLimit: 1 })).status).toBe(200)
    // mas a próxima entrada bate no limite
    const extra = await makeCard({ pipelineId: p.id, stageId: p.stageIds[0]! })
    await expectError(await request("POST", `/cards/${extra.id}/move`, { toStageId: stage }), 422, "wip_limit_exceeded")
  })

  test("inexistente → 404", async () => {
    await expectError(
      await request("PUT", "/stages/00000000-0000-0000-0000-000000000000", { name: "X" }),
      404,
      "not_found",
    )
  })
})
