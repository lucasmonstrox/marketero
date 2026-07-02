/** Integração — POST /cards (pouso default, evento, WIP atômico). */
import { beforeEach, describe, expect, test } from "bun:test"

import {
  cardEventsOf,
  dbCount,
  expectError,
  json,
  makeCard,
  makeContact,
  makePipeline,
  request,
  resetDb,
} from "../../../shared/testing/harness"

type CardDto = { id: string; stageId: string; position: number; tags: string[] }

describe("POST /cards", () => {
  beforeEach(resetDb)

  test("sem stageId → pousa na coluna type=new; emite card.created", async () => {
    const p = await makePipeline()
    const contact = await makeContact()
    const res = await request("POST", "/cards", {
      pipelineId: p.id,
      contactId: contact.id,
      title: "Plano anual",
      valueCents: 129900,
      channel: "whatsapp",
    })
    expect(res.status).toBe(201)
    const body = await json<CardDto>(res)
    expect(body.stageId).toBe(p.stageIds[0]!) // a etapa new
    expect(body.position).toBe(1024) // coluna vazia → GAP
    const events = await cardEventsOf(body.id)
    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe("card.created")
    expect(events[0]!.payload).toMatchObject({ pipeline_id: p.id, stage_id: p.stageIds[0], contact_id: contact.id })
  })

  test("stageId explícito de OUTRO pipeline → 422 stage_not_in_pipeline", async () => {
    const p = await makePipeline()
    const other = await makePipeline()
    const contact = await makeContact()
    const res = await request("POST", "/cards", {
      pipelineId: p.id,
      stageId: other.stageIds[1],
      contactId: contact.id,
      title: "X",
      channel: "web",
    })
    await expectError(res, 422, "stage_not_in_pipeline")
  })

  test("coluna cheia (WIP) → 422 e o card NÃO existe (atomicidade)", async () => {
    const p = await makePipeline({
      stages: [
        { name: "Entrada", type: "new", wipLimit: 1 },
        { name: "Meio", type: "active" },
      ],
    })
    await makeCard({ pipelineId: p.id, stageId: p.stageIds[0]! }) // lota
    const contact = await makeContact()
    const res = await request("POST", "/cards", { pipelineId: p.id, contactId: contact.id, title: "Y", channel: "web" })
    await expectError(res, 422, "wip_limit_exceeded")
    expect(await dbCount("cards", "title = $1", ["Y"])).toBe(0)
  })

  test("pipeline inexistente → 404", async () => {
    const contact = await makeContact()
    const res = await request("POST", "/cards", {
      pipelineId: "00000000-0000-0000-0000-000000000000",
      contactId: contact.id,
      title: "X",
      channel: "web",
    })
    await expectError(res, 404, "pipeline_not_found")
  })

  test("posições sequenciais: 1024, 2048, 3072", async () => {
    const p = await makePipeline()
    const contact = await makeContact()
    const positions: number[] = []
    for (let i = 0; i < 3; i++) {
      const body = await json<CardDto>(
        await request("POST", "/cards", { pipelineId: p.id, contactId: contact.id, title: `C${i}`, channel: "web" }),
      )
      positions.push(body.position)
    }
    expect(positions).toEqual([1024, 2048, 3072])
  })
})
