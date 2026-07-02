/** Integração — GET /pipelines/:id/board (a visão do kanban inteira). */
import { beforeEach, describe, expect, test } from "bun:test"

import { expectError, json, makeCard, makePipeline, request, resetDb } from "../../../shared/testing/harness"

type Board = {
  pipeline: { id: string }
  stages: Array<{ id: string; position: number; cards: Array<{ id: string; position: number }> }>
}

describe("GET /pipelines/:id/board", () => {
  beforeEach(resetDb)

  test("colunas ordenadas, cards ordenados, coluna vazia = []", async () => {
    const p = await makePipeline()
    // dois cards fora de ordem de inserção na coluna 1 (positions controladas)
    const c2 = await makeCard({ pipelineId: p.id, stageId: p.stageIds[1]!, position: 2048 })
    const c1 = await makeCard({ pipelineId: p.id, stageId: p.stageIds[1]!, position: 1024 })
    const board = await json<Board>(await request("GET", `/pipelines/${p.id}/board`))
    expect(board.stages.map((s) => s.position)).toEqual([0, 1, 2, 3, 4])
    expect(board.stages[1]!.cards.map((c) => c.id)).toEqual([c1.id, c2.id]) // por position, não inserção
    expect(board.stages[0]!.cards).toEqual([]) // vazia vem explícita
  })

  test("inexistente → 404", async () => {
    await expectError(await request("GET", "/pipelines/00000000-0000-0000-0000-000000000000/board"), 404, "not_found")
  })
})
