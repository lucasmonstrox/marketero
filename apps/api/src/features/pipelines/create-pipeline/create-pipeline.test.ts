/** Integração — POST /pipelines. */
import { beforeEach, describe, expect, test } from "bun:test"

import { expectError, json, request, resetDb } from "../../../shared/testing/harness"

type PipelineDto = { id: string; name: string; isDefault: boolean; stages: Array<{ position: number; type: string }> }

describe("POST /pipelines", () => {
  beforeEach(resetDb)

  test("sem stages → cria kanban vazio, nunca default", async () => {
    const res = await request("POST", "/pipelines", { name: "Atendimento" })
    expect(res.status).toBe(201)
    const body = await json<PipelineDto>(res)
    expect(body.isDefault).toBe(false)
    expect(body.stages).toHaveLength(0)
  })

  test("com stages (1 new) → positions densas 0..n-1", async () => {
    const res = await request("POST", "/pipelines", {
      name: "Recuperação",
      stages: [
        { name: "Entrou", type: "new" },
        { name: "Trabalhando", type: "active", wipLimit: 5 },
        { name: "Recuperado", type: "won" },
      ],
    })
    const body = await json<PipelineDto>(res)
    expect(body.stages.map((s) => s.position)).toEqual([0, 1, 2])
  })

  test("0 news → 422 invalid_stage_set", async () => {
    const res = await request("POST", "/pipelines", { name: "X", stages: [{ name: "A", type: "active" }] })
    await expectError(res, 422, "invalid_stage_set")
  })

  test("2 news → 422 invalid_stage_set", async () => {
    const res = await request("POST", "/pipelines", {
      name: "X",
      stages: [
        { name: "A", type: "new" },
        { name: "B", type: "new" },
      ],
    })
    await expectError(res, 422, "invalid_stage_set")
  })
})
