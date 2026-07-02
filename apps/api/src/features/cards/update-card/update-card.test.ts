/** Integração — PUT /cards/:id (não-posicional; mover é só via /move). */
import { beforeEach, describe, expect, test } from "bun:test"

import { cardEventsOf, dbCard, expectError, json, makeCard, makePipeline, request, resetDb } from "../../../shared/testing/harness"

describe("PUT /cards/:id", () => {
  beforeEach(resetDb)

  test("atualiza título/valor/tags/intent sem tocar em stage/position e sem eventos", async () => {
    const p = await makePipeline()
    const card = await makeCard({ pipelineId: p.id, stageId: p.stageIds[1]!, position: 777 })
    const body = await json<{ title: string; valueCents: number; tags: string[]; intent: string }>(
      await request("PUT", `/cards/${card.id}`, {
        title: "Novo título",
        valueCents: 9900,
        tags: ["vip"],
        intent: "intencao_de_compra",
      }),
    )
    expect(body.title).toBe("Novo título")
    expect(body.tags).toEqual(["vip"])
    const row = (await dbCard(card.id))!
    expect(row.stageId).toBe(p.stageIds[1]!) // intacto
    expect(row.position).toBe(777) // intacto
    expect(await cardEventsOf(card.id)).toHaveLength(0) // update não é movimento
  })

  test("inexistente → 404", async () => {
    await expectError(
      await request("PUT", "/cards/00000000-0000-0000-0000-000000000000", { title: "X" }),
      404,
      "not_found",
    )
  })
})
