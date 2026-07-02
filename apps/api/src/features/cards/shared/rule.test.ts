/** Unit — regras puras da feature Cards (sem DB). */
import { describe, expect, test } from "bun:test"

import { computePosition, isNoopMove, landingStage, POSITION_GAP, wipExceeded } from "./rule"

describe("computePosition", () => {
  test("coluna vazia → GAP", () => {
    expect(computePosition(null, null)).toEqual({ kind: "position", position: POSITION_GAP })
  })
  test("fim → prev+GAP", () => {
    expect(computePosition(2048, null)).toEqual({ kind: "position", position: 2048 + POSITION_GAP })
  })
  test("início → next−GAP", () => {
    expect(computePosition(null, 1024)).toEqual({ kind: "position", position: 0 })
  })
  test("meio → média", () => {
    expect(computePosition(1024, 2048)).toEqual({ kind: "position", position: 1536 })
  })
  test("gap esgotado (adjacentes) → reindex", () => {
    expect(computePosition(1024, 1025)).toEqual({ kind: "reindex" })
  })
})

describe("wipExceeded", () => {
  test("limit 0 = ilimitado", () => {
    expect(wipExceeded(0, 9999)).toBe(false)
  })
  test("abaixo do limite → false", () => {
    expect(wipExceeded(3, 2)).toBe(false)
  })
  test("borda: count == limit → true (a entrada estouraria)", () => {
    expect(wipExceeded(3, 3)).toBe(true)
  })
})

describe("isNoopMove", () => {
  test("mesmo stage sem position → no-op", () => {
    expect(isNoopMove("s1", "s1", undefined)).toBe(true)
  })
  test("mesmo stage com position → NÃO é no-op (reorder interno)", () => {
    expect(isNoopMove("s1", "s1", 512)).toBe(false)
  })
  test("stage diferente → não é no-op", () => {
    expect(isNoopMove("s1", "s2", undefined)).toBe(false)
  })
})

describe("landingStage", () => {
  const cols = [
    { id: "entry", type: "new" },
    { id: "work", type: "active" },
  ]
  test("explícito válido → ele mesmo", () => {
    expect(landingStage(cols, "work")).toEqual({ ok: true, stageId: "work" })
  })
  test("explícito de outro pipeline → stage_not_in_pipeline", () => {
    expect(landingStage(cols, "alien")).toEqual({ ok: false, reason: "stage_not_in_pipeline" })
  })
  test("sem explícito → pousa no new", () => {
    expect(landingStage(cols)).toEqual({ ok: true, stageId: "entry" })
  })
  test("pipeline sem new e sem explícito → no_landing_stage", () => {
    expect(landingStage([{ id: "work", type: "active" }])).toEqual({ ok: false, reason: "no_landing_stage" })
  })
})
