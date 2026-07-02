/** Integração — POST /cards/:id/move (o coração da v1). */
import { beforeEach, describe, expect, test } from "bun:test"

import {
  cardEventsOf,
  dbCard,
  expectError,
  json,
  makeCard,
  makePipeline,
  request,
  resetDb,
} from "../../../shared/testing/harness"

type MoveDto = { card: { stageId: string; pipelineId: string; position: number }; moved: boolean }

describe("POST /cards/:id/move — mesmo pipeline", () => {
  beforeEach(resetDb)

  test("happy: muda stage/position/entered_stage_at e grava card.stage_changed", async () => {
    const p = await makePipeline()
    const card = await makeCard({ pipelineId: p.id, stageId: p.stageIds[0]! })
    const before = (await dbCard(card.id))!
    const body = await json<MoveDto>(await request("POST", `/cards/${card.id}/move`, { toStageId: p.stageIds[1] }))
    expect(body.moved).toBe(true)
    expect(body.card.stageId).toBe(p.stageIds[1]!)
    const after = (await dbCard(card.id))!
    expect(after.enteredStageAt.getTime()).toBeGreaterThan(before.enteredStageAt.getTime())
    const events = await cardEventsOf(card.id)
    expect(events).toHaveLength(1)
    expect(events[0]!.payload).toMatchObject({ from_stage_id: p.stageIds[0], to_stage_id: p.stageIds[1], moved_by: null })
  })

  test("no-op (mesmo stage, sem position) → moved:false, ZERO eventos, relógio intacto", async () => {
    const p = await makePipeline()
    const card = await makeCard({ pipelineId: p.id, stageId: p.stageIds[1]! })
    const before = (await dbCard(card.id))!
    const body = await json<MoveDto>(await request("POST", `/cards/${card.id}/move`, { toStageId: p.stageIds[1] }))
    expect(body.moved).toBe(false)
    expect(await cardEventsOf(card.id)).toHaveLength(0)
    expect((await dbCard(card.id))!.enteredStageAt).toEqual(before.enteredStageAt)
  })

  test("reorder interno (mesmo stage + position) → move posição SEM evento e SEM resetar relógio", async () => {
    const p = await makePipeline()
    const stage = p.stageIds[1]!
    const a = await makeCard({ pipelineId: p.id, stageId: stage, position: 1024 })
    const b = await makeCard({ pipelineId: p.id, stageId: stage, position: 2048 })
    const beforeB = (await dbCard(b.id))!
    // b quer ficar ANTES de a
    const body = await json<MoveDto>(await request("POST", `/cards/${b.id}/move`, { toStageId: stage, position: 500 }))
    expect(body.moved).toBe(true)
    expect(body.card.position).toBeLessThan(1024)
    expect(await cardEventsOf(b.id)).toHaveLength(0) // reorder não é mudança de etapa
    expect((await dbCard(b.id))!.enteredStageAt).toEqual(beforeB.enteredStageAt)
    void a
  })

  test("destino no WIP → 422, card não moveu, zero eventos", async () => {
    const p = await makePipeline()
    const lotada = await request("PUT", `/stages/${p.stageIds[2]}`, { wipLimit: 1 })
    expect(lotada.status).toBe(200)
    await makeCard({ pipelineId: p.id, stageId: p.stageIds[2]! }) // ocupa a única vaga
    const card = await makeCard({ pipelineId: p.id, stageId: p.stageIds[0]! })
    await expectError(await request("POST", `/cards/${card.id}/move`, { toStageId: p.stageIds[2] }), 422, "wip_limit_exceeded")
    expect((await dbCard(card.id))!.stageId).toBe(p.stageIds[0]!)
    expect(await cardEventsOf(card.id)).toHaveLength(0)
  })

  test("gap esgotado entre vizinhos → reindex transacional e ordem final correta", async () => {
    const p = await makePipeline()
    const stage = p.stageIds[1]!
    const a = await makeCard({ pipelineId: p.id, stageId: stage, position: 1024 })
    const b = await makeCard({ pipelineId: p.id, stageId: stage, position: 1025 }) // adjacente — sem gap
    const c = await makeCard({ pipelineId: p.id, stageId: p.stageIds[0]! })
    // c quer entrar EXATAMENTE entre a e b
    const body = await json<MoveDto>(await request("POST", `/cards/${c.id}/move`, { toStageId: stage, position: 1025 }))
    expect(body.moved).toBe(true)
    const [pa, pb, pc] = await Promise.all([dbCard(a.id), dbCard(b.id), dbCard(c.id)])
    expect(pa!.position).toBeLessThan(pc!.position)
    expect(pc!.position).toBeLessThan(pb!.position)
  })

  test("sem destino nenhum → 422 missing_target", async () => {
    const p = await makePipeline()
    const card = await makeCard({ pipelineId: p.id, stageId: p.stageIds[0]! })
    await expectError(await request("POST", `/cards/${card.id}/move`, {}), 422, "missing_target")
  })

  test("card inexistente → 404", async () => {
    const p = await makePipeline()
    await expectError(
      await request("POST", "/cards/00000000-0000-0000-0000-000000000000/move", { toStageId: p.stageIds[1] }),
      404,
      "not_found",
    )
  })
})

describe("POST /cards/:id/move — cross-pipeline", () => {
  beforeEach(resetDb)

  test("sem toStageId → pousa no type=new do destino; emite pipeline_changed E stage_changed em ordem", async () => {
    const origem = await makePipeline()
    const destino = await makePipeline()
    const card = await makeCard({ pipelineId: origem.id, stageId: origem.stageIds[2]! })
    const body = await json<MoveDto>(await request("POST", `/cards/${card.id}/move`, { toPipelineId: destino.id }))
    expect(body.card.pipelineId).toBe(destino.id)
    expect(body.card.stageId).toBe(destino.stageIds[0]!) // pousa no new — NUNCA herda o stage antigo
    const events = await cardEventsOf(card.id)
    expect(events.map((e) => e.type)).toEqual(["card.pipeline_changed", "card.stage_changed"])
    expect(events[0]!.payload).toMatchObject({
      from_pipeline_id: origem.id,
      to_pipeline_id: destino.id,
      landing_stage_id: destino.stageIds[0],
    })
  })

  test("com toStageId explícito do destino → pousa nele", async () => {
    const origem = await makePipeline()
    const destino = await makePipeline()
    const card = await makeCard({ pipelineId: origem.id, stageId: origem.stageIds[0]! })
    const body = await json<MoveDto>(
      await request("POST", `/cards/${card.id}/move`, { toPipelineId: destino.id, toStageId: destino.stageIds[2] }),
    )
    expect(body.card.stageId).toBe(destino.stageIds[2]!)
  })

  test("destino sem type=new e sem toStageId → 422 no_landing_stage", async () => {
    const origem = await makePipeline()
    // pipeline destino SEM etapa new (montado direto no banco pela factory)
    const destino = await makePipeline({ stages: [{ name: "Só ativa", type: "active" }] })
    const card = await makeCard({ pipelineId: origem.id, stageId: origem.stageIds[0]! })
    await expectError(await request("POST", `/cards/${card.id}/move`, { toPipelineId: destino.id }), 422, "no_landing_stage")
  })

  test("pipeline destino inexistente → 404", async () => {
    const origem = await makePipeline()
    const card = await makeCard({ pipelineId: origem.id, stageId: origem.stageIds[0]! })
    await expectError(
      await request("POST", `/cards/${card.id}/move`, { toPipelineId: "00000000-0000-0000-0000-000000000000" }),
      404,
      "pipeline_not_found",
    )
  })
})
