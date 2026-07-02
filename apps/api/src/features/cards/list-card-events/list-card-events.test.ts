/** Integração — GET /cards/:id/events (timeline em ordem causal). */
import { beforeEach, describe, expect, test } from "bun:test"

import { expectError, json, makeContact, makePipeline, request, resetDb } from "../../../shared/testing/harness"

type EventDto = { type: string; seq: number }

describe("GET /cards/:id/events", () => {
  beforeEach(resetDb)

  test("cadeia completa: created → stage_changed → pipeline_changed+stage_changed, seq crescente", async () => {
    const p = await makePipeline()
    const destino = await makePipeline()
    const contact = await makeContact()
    // via API para o evento de criação existir
    const created = await json<{ id: string }>(
      await request("POST", "/cards", { pipelineId: p.id, contactId: contact.id, title: "Jornada", channel: "instagram" }),
    )
    await request("POST", `/cards/${created.id}/move`, { toStageId: p.stageIds[1] })
    await request("POST", `/cards/${created.id}/move`, { toPipelineId: destino.id })

    const events = await json<EventDto[]>(await request("GET", `/cards/${created.id}/events`))
    expect(events.map((e) => e.type)).toEqual([
      "card.created",
      "card.stage_changed",
      "card.pipeline_changed",
      "card.stage_changed",
    ])
    const seqs = events.map((e) => e.seq)
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs) // estritamente crescente
    expect(new Set(seqs).size).toBe(seqs.length)
  })

  test("paginação por limit/offset", async () => {
    const p = await makePipeline()
    const contact = await makeContact()
    const created = await json<{ id: string }>(
      await request("POST", "/cards", { pipelineId: p.id, contactId: contact.id, title: "X", channel: "web" }),
    )
    await request("POST", `/cards/${created.id}/move`, { toStageId: p.stageIds[1] })
    const page = await json<EventDto[]>(await request("GET", `/cards/${created.id}/events?limit=1&offset=1`))
    expect(page).toHaveLength(1)
    expect(page[0]!.type).toBe("card.stage_changed")
  })

  test("card inexistente → 404 (≠ card sem eventos)", async () => {
    await expectError(await request("GET", "/cards/00000000-0000-0000-0000-000000000000/events"), 404, "not_found")
  })
})
