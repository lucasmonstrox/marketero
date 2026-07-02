/** Integração — POST /pipelines/:pipelineId/stages. */
import { beforeEach, describe, expect, test } from "bun:test"

import { expectError, json, makePipeline, request, resetDb } from "../../../shared/testing/harness"

describe("POST /pipelines/:pipelineId/stages", () => {
  beforeEach(resetDb)

  test("cria no fim do board (position = max+1)", async () => {
    const p = await makePipeline() // positions 0..4
    const res = await request("POST", `/pipelines/${p.id}/stages`, { name: "Pós-venda", type: "active" })
    expect(res.status).toBe(201)
    const body = await json<{ position: number; wipLimit: number }>(res)
    expect(body.position).toBe(5)
    expect(body.wipLimit).toBe(0)
  })

  test("segundo type=new → 422 duplicate_new_stage", async () => {
    const p = await makePipeline()
    const res = await request("POST", `/pipelines/${p.id}/stages`, { name: "Outra entrada", type: "new" })
    await expectError(res, 422, "duplicate_new_stage")
  })

  test("pipeline inexistente → 404", async () => {
    const res = await request("POST", "/pipelines/00000000-0000-0000-0000-000000000000/stages", {
      name: "X",
      type: "active",
    })
    await expectError(res, 404, "not_found")
  })
})
