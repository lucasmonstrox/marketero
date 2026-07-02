/** Unit — regras puras da feature Pipelines (sem DB). */
import { describe, expect, test } from "bun:test"

import { canDeletePipeline, validateStageSet } from "./rule"

describe("validateStageSet", () => {
  test("exatamente 1 new → ok", () => {
    expect(validateStageSet(["new", "active", "won"])).toBeNull()
  })
  test("0 news → erro", () => {
    expect(validateStageSet(["active", "won"])).toContain("precisa de 1 etapa type=new")
  })
  test("2 news → erro", () => {
    expect(validateStageSet(["new", "new", "won"])).toContain("só pode ter 1 etapa type=new")
  })
})

describe("canDeletePipeline", () => {
  test("default → bloqueia", () => {
    expect(canDeletePipeline(true, 0)).toEqual({ ok: false, reason: "default_pipeline" })
  })
  test("com cards → bloqueia", () => {
    expect(canDeletePipeline(false, 3)).toEqual({ ok: false, reason: "has_cards" })
  })
  test("vazio não-default → ok", () => {
    expect(canDeletePipeline(false, 0)).toEqual({ ok: true })
  })
})
