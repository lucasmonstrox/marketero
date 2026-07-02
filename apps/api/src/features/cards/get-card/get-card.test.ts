/** Integração — GET /cards/:id. */
import { beforeEach, describe, expect, test } from "bun:test"

import { expectError, json, makeCard, makePipeline, request, resetDb } from "../../../shared/testing/harness"

describe("GET /cards/:id", () => {
  beforeEach(resetDb)

  test("existente → 200 com o contrato completo", async () => {
    const p = await makePipeline()
    const card = await makeCard({ pipelineId: p.id, stageId: p.stageIds[0]!, title: "Consultoria", valueCents: 5000 })
    const body = await json<{ id: string; title: string; valueCents: number; custom: unknown }>(
      await request("GET", `/cards/${card.id}`),
    )
    expect(body.title).toBe("Consultoria")
    expect(body.valueCents).toBe(5000)
    expect(body.custom).toBeNull()
  })

  test("inexistente → 404", async () => {
    await expectError(await request("GET", "/cards/00000000-0000-0000-0000-000000000000"), 404, "not_found")
  })
})
