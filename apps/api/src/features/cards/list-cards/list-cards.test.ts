/** Integração — GET /cards (filtros compostos + ordem do board). */
import { beforeEach, describe, expect, test } from "bun:test"

import { json, makeCard, makeContact, makePipeline, request, resetDb } from "../../../shared/testing/harness"

describe("GET /cards", () => {
  beforeEach(resetDb)

  test("filtra por pipeline, stage e contact", async () => {
    const p1 = await makePipeline()
    const p2 = await makePipeline()
    const contact = await makeContact()
    await makeCard({ pipelineId: p1.id, stageId: p1.stageIds[0]!, contactId: contact.id })
    await makeCard({ pipelineId: p1.id, stageId: p1.stageIds[1]! })
    await makeCard({ pipelineId: p2.id, stageId: p2.stageIds[0]! })

    expect(await json<unknown[]>(await request("GET", `/cards?pipelineId=${p1.id}`))).toHaveLength(2)
    expect(await json<unknown[]>(await request("GET", `/cards?stageId=${p1.stageIds[1]}`))).toHaveLength(1)
    expect(await json<unknown[]>(await request("GET", `/cards?contactId=${contact.id}`))).toHaveLength(1)
    expect(await json<unknown[]>(await request("GET", "/cards"))).toHaveLength(3)
  })

  test("dentro do stage, ordena por position", async () => {
    const p = await makePipeline()
    const stage = p.stageIds[0]!
    const late = await makeCard({ pipelineId: p.id, stageId: stage, position: 5000 })
    const early = await makeCard({ pipelineId: p.id, stageId: stage, position: 100 })
    const body = await json<Array<{ id: string }>>(await request("GET", `/cards?stageId=${stage}`))
    expect(body.map((c) => c.id)).toEqual([early.id, late.id])
  })
})
