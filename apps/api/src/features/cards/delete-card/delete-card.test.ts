/** Integração — DELETE /cards/:id (timeline cascateia). */
import { beforeEach, describe, expect, test } from "bun:test"

import { dbCount, expectError, makeCard, makePipeline, request, resetDb } from "../../../shared/testing/harness"

describe("DELETE /cards/:id", () => {
  beforeEach(resetDb)

  test("apaga card e eventos juntos", async () => {
    const p = await makePipeline()
    const card = await makeCard({ pipelineId: p.id, stageId: p.stageIds[0]! })
    await request("POST", `/cards/${card.id}/move`, { toStageId: p.stageIds[1] }) // gera 1 evento
    const res = await request("DELETE", `/cards/${card.id}`)
    expect(res.status).toBe(204)
    expect(await dbCount("cards", "id = $1", [card.id])).toBe(0)
    expect(await dbCount("card_events", "card_id = $1", [card.id])).toBe(0) // cascade
  })

  test("inexistente → 404", async () => {
    await expectError(await request("DELETE", "/cards/00000000-0000-0000-0000-000000000000"), 404, "not_found")
  })
})
