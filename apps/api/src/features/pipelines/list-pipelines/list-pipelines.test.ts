/** Integração — GET /pipelines (default primeiro; seed idempotente). */
import { beforeEach, describe, expect, test } from "bun:test"

import { pool } from "@workspace/db"
import { seedDefaults } from "@workspace/db/seed"

import { json, makePipeline, request, resetDb } from "../../../shared/testing/harness"

type PipelineDto = { id: string; isDefault: boolean; stages: Array<{ type: string }> }

describe("GET /pipelines", () => {
  beforeEach(resetDb)

  test("default vem primeiro, com as 5 etapas canônicas", async () => {
    await makePipeline({ name: "Outro" })
    const body = await json<PipelineDto[]>(await request("GET", "/pipelines"))
    expect(body).toHaveLength(2)
    expect(body[0]!.isDefault).toBe(true)
    expect(body[0]!.stages.map((s) => s.type)).toEqual(["new", "active", "active", "won", "lost"])
  })

  test("seed é idempotente: rodar de novo não duplica o default", async () => {
    await seedDefaults(pool)
    await seedDefaults(pool)
    const body = await json<PipelineDto[]>(await request("GET", "/pipelines"))
    expect(body.filter((p) => p.isDefault)).toHaveLength(1)
  })
})
