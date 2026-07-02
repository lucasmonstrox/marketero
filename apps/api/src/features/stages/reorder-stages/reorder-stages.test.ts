/** Integração — PATCH /pipelines/:pipelineId/stages/reorder (reindex denso). */
import { beforeEach, describe, expect, test } from "bun:test"

import { dbColumn, expectError, json, makePipeline, request, resetDb } from "../../../shared/testing/harness"

describe("PATCH /pipelines/:pipelineId/stages/reorder", () => {
  beforeEach(resetDb)

  test("permutação completa → positions reindexadas 0..n-1 (provado no banco)", async () => {
    const p = await makePipeline() // [s0..s4]
    const reversed = [...p.stageIds].reverse()
    const body = await json<Array<{ id: string; position: number }>>(
      await request("PATCH", `/pipelines/${p.id}/stages/reorder`, { stageIds: reversed }),
    )
    expect(body.map((s) => s.id)).toEqual(reversed)
    expect(body.map((s) => s.position)).toEqual([0, 1, 2, 3, 4])
    expect(await dbColumn<number>("stages", "position", p.stageIds[0]!)).toBe(4) // o antigo primeiro foi pro fim
  })

  test("lista incompleta → 422 invalid_reorder", async () => {
    const p = await makePipeline()
    await expectError(
      await request("PATCH", `/pipelines/${p.id}/stages/reorder`, { stageIds: p.stageIds.slice(1) }),
      422,
      "invalid_reorder",
    )
  })

  test("id de outro pipeline → 422 invalid_reorder", async () => {
    const p = await makePipeline()
    const other = await makePipeline()
    const ids = [...p.stageIds.slice(0, -1), other.stageIds[0]!]
    await expectError(await request("PATCH", `/pipelines/${p.id}/stages/reorder`, { stageIds: ids }), 422, "invalid_reorder")
  })

  test("pipeline inexistente → 404", async () => {
    await expectError(
      await request("PATCH", "/pipelines/00000000-0000-0000-0000-000000000000/stages/reorder", {
        stageIds: ["00000000-0000-0000-0000-000000000001"],
      }),
      404,
      "not_found",
    )
  })
})
