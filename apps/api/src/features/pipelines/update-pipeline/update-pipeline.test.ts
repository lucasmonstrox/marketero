/** Integração — PUT /pipelines/:id (renomear; isDefault imutável). */
import { beforeEach, describe, expect, test } from "bun:test"

import { expectError, json, makePipeline, request, resetDb } from "../../../shared/testing/harness"

describe("PUT /pipelines/:id", () => {
  beforeEach(resetDb)

  test("renomeia", async () => {
    const { id } = await makePipeline({ name: "Antes" })
    const body = await json<{ name: string }>(await request("PUT", `/pipelines/${id}`, { name: "Depois" }))
    expect(body.name).toBe("Depois")
  })

  test("inexistente → 404", async () => {
    await expectError(
      await request("PUT", "/pipelines/00000000-0000-0000-0000-000000000000", { name: "X" }),
      404,
      "not_found",
    )
  })
})
