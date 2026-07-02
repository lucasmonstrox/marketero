/** Integração — PUT /contacts/:id (parcial). */
import { beforeEach, describe, expect, test } from "bun:test"

import { dbColumn, expectError, json, makeContact, request, resetDb } from "../../../shared/testing/harness"

describe("PUT /contacts/:id", () => {
  beforeEach(resetDb)

  test("atualiza só o que veio (parcial)", async () => {
    const { id } = await makeContact({ name: "Antes", email: "fica@ex.com" })
    const body = await json<{ name: string; email: string }>(
      await request("PUT", `/contacts/${id}`, { name: "Depois" }),
    )
    expect(body.name).toBe("Depois")
    expect(body.email).toBe("fica@ex.com") // intacto
    expect(await dbColumn<string>("contacts", "name", id)).toBe("Depois")
  })

  test("inexistente → 404", async () => {
    await expectError(
      await request("PUT", "/contacts/00000000-0000-0000-0000-000000000000", { name: "X" }),
      404,
      "not_found",
    )
  })
})
