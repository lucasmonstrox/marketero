/** Unit — regras puras da feature Stages (sem DB). */
import { describe, expect, test } from "bun:test"

import { isLastNewStage, nextPosition, validateReorder } from "./rule"

describe("isLastNewStage", () => {
  const stages = [
    { id: "a", type: "new" },
    { id: "b", type: "active" },
    { id: "c", type: "won" },
  ]
  test("único new → true", () => {
    expect(isLastNewStage(stages, "a")).toBe(true)
  })
  test("dois news → false", () => {
    expect(isLastNewStage([...stages, { id: "d", type: "new" }], "a")).toBe(false)
  })
  test("stage não-new → false", () => {
    expect(isLastNewStage(stages, "b")).toBe(false)
  })
  test("stage inexistente → false", () => {
    expect(isLastNewStage(stages, "zzz")).toBe(false)
  })
})

describe("nextPosition", () => {
  test("board vazio → 0", () => {
    expect(nextPosition([])).toBe(0)
  })
  test("fim do board → max+1", () => {
    expect(nextPosition([0, 1, 2])).toBe(3)
  })
})

describe("validateReorder", () => {
  const current = ["a", "b", "c"]
  test("permutação válida → null", () => {
    expect(validateReorder(["c", "a", "b"], current)).toBeNull()
  })
  test("id faltando → erro", () => {
    expect(validateReorder(["a", "b"], current)).toContain("esperava 3")
  })
  test("id extra → erro", () => {
    expect(validateReorder(["a", "b", "c", "d"], current)).toContain("esperava 3")
  })
  test("id duplicado → erro", () => {
    expect(validateReorder(["a", "a", "b"], current)).toContain("duplicado")
  })
  test("id de fora → erro", () => {
    expect(validateReorder(["a", "b", "z"], current)).toContain("não pertence")
  })
})
