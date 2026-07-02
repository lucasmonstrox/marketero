/** Integração — GET /pipelines/:id. */
import { beforeEach, describe, expect, test } from "bun:test"

import { expectError, json, makePipeline, request, resetDb } from "../../../shared/testing/harness"

describe("GET /pipelines/:id", () => {
  beforeEach(resetDb)

  test("existente → 200 com stages ordenadas", async () => {
    const { id } = await makePipeline()
    const body = await json<{ id: string; stages: Array<{ position: number }> }>(
      await request("GET", `/pipelines/${id}`),
    )
    expect(body.id).toBe(id)
    expect(body.stages.map((s) => s.position)).toEqual([0, 1, 2, 3, 4])
  })

  test("inexistente → 404", async () => {
    await expectError(await request("GET", "/pipelines/00000000-0000-0000-0000-000000000000"), 404, "not_found")
  })
})
