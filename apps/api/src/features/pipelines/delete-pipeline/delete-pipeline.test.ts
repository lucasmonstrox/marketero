/** Integração — DELETE /pipelines/:id (proteções do default e de cards). */
import { beforeEach, describe, expect, test } from "bun:test"

import { json, dbCount, expectError, makeCard, makePipeline, request, resetDb } from "../../../shared/testing/harness"

describe("DELETE /pipelines/:id", () => {
  beforeEach(resetDb)

  test("não-default vazio → 204 (stages cascateiam)", async () => {
    const { id } = await makePipeline()
    const res = await request("DELETE", `/pipelines/${id}`)
    expect(res.status).toBe(204)
    expect(await dbCount("pipelines", "id = $1", [id])).toBe(0)
    expect(await dbCount("stages", "pipeline_id = $1", [id])).toBe(0)
  })

  test("default → 422 default_pipeline (invariante do produto)", async () => {
    const list = await json<Array<{ id: string; isDefault: boolean }>>(await request("GET", "/pipelines"))
    const def = list.find((p) => p.isDefault)!
    await expectError(await request("DELETE", `/pipelines/${def.id}`), 422, "default_pipeline")
  })

  test("com cards → 422 has_cards e nada some", async () => {
    const p = await makePipeline()
    await makeCard({ pipelineId: p.id, stageId: p.stageIds[1]! })
    await expectError(await request("DELETE", `/pipelines/${p.id}`), 422, "has_cards")
    expect(await dbCount("pipelines", "id = $1", [p.id])).toBe(1)
  })

  test("inexistente → 404", async () => {
    await expectError(await request("DELETE", "/pipelines/00000000-0000-0000-0000-000000000000"), 404, "not_found")
  })
})
