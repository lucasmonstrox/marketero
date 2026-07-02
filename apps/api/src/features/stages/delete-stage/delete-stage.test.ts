/** Integração — DELETE /stages/:id (migração atômica com eventos). */
import { beforeEach, describe, expect, test } from "bun:test"

import {
  cardEventsOf,
  dbColumn,
  dbCount,
  expectError,
  makeCard,
  makePipeline,
  makeStage,
  request,
  resetDb,
} from "../../../shared/testing/harness"

describe("DELETE /stages/:id", () => {
  beforeEach(resetDb)

  test("sem cards → 204", async () => {
    const p = await makePipeline()
    const res = await request("DELETE", `/stages/${p.stageIds[2]}`)
    expect(res.status).toBe(204)
    expect(await dbCount("stages", "id = $1", [p.stageIds[2]!])).toBe(0)
  })

  test("com cards e sem moveCardsTo → 422 stage_has_cards", async () => {
    const p = await makePipeline()
    await makeCard({ pipelineId: p.id, stageId: p.stageIds[1]! })
    await expectError(await request("DELETE", `/stages/${p.stageIds[1]}`), 422, "stage_has_cards")
  })

  test("com moveCardsTo → cards migram + 1 card.stage_changed POR card", async () => {
    const p = await makePipeline()
    const from = p.stageIds[1]!
    const to = p.stageIds[2]!
    const a = await makeCard({ pipelineId: p.id, stageId: from })
    const b = await makeCard({ pipelineId: p.id, stageId: from })
    const res = await request("DELETE", `/stages/${from}?moveCardsTo=${to}`)
    expect(res.status).toBe(204)
    expect(await dbColumn<string>("cards", "stage_id", a.id)).toBe(to)
    expect(await dbColumn<string>("cards", "stage_id", b.id)).toBe(to)
    for (const card of [a, b]) {
      const events = await cardEventsOf(card.id)
      expect(events).toHaveLength(1)
      expect(events[0]!.type).toBe("card.stage_changed")
      expect(events[0]!.payload).toMatchObject({ from_stage_id: from, to_stage_id: to })
    }
  })

  test("destino estourando WIP → 422 e NADA migra (atomicidade)", async () => {
    const p = await makePipeline()
    const from = p.stageIds[1]!
    const to = await makeStage(p.id, { wipLimit: 1 })
    await makeCard({ pipelineId: p.id, stageId: from })
    await makeCard({ pipelineId: p.id, stageId: from })
    await expectError(await request("DELETE", `/stages/${from}?moveCardsTo=${to.id}`), 422, "wip_limit_exceeded")
    expect(await dbCount("cards", "stage_id = $1", [from])).toBe(2) // intactos
    expect(await dbCount("stages", "id = $1", [from])).toBe(1) // coluna viva
  })

  test("destino de outro pipeline ou a própria coluna → 422 invalid_target", async () => {
    const p = await makePipeline()
    const other = await makePipeline()
    const from = p.stageIds[1]!
    await makeCard({ pipelineId: p.id, stageId: from })
    await expectError(await request("DELETE", `/stages/${from}?moveCardsTo=${other.stageIds[2]}`), 422, "invalid_target")
    await expectError(await request("DELETE", `/stages/${from}?moveCardsTo=${from}`), 422, "invalid_target")
  })

  test("único type=new → 422 last_new_stage (mesmo vazio)", async () => {
    const p = await makePipeline()
    await expectError(await request("DELETE", `/stages/${p.stageIds[0]}`), 422, "last_new_stage")
  })

  test("inexistente → 404", async () => {
    await expectError(await request("DELETE", "/stages/00000000-0000-0000-0000-000000000000"), 404, "not_found")
  })
})
