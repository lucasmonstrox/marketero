/** Integração — GET /contacts/:id. */
import { beforeEach, describe, expect, test } from "bun:test"

import { expectError, json, makeContact, request, resetDb } from "../../../shared/testing/harness"

describe("GET /contacts/:id", () => {
  beforeEach(resetDb)

  test("existente → 200", async () => {
    const { id } = await makeContact({ name: "Zé" })
    const body = await json<{ id: string; name: string }>(await request("GET", `/contacts/${id}`))
    expect(body.id).toBe(id)
    expect(body.name).toBe("Zé")
  })

  test("inexistente → 404", async () => {
    await expectError(await request("GET", "/contacts/00000000-0000-0000-0000-000000000000"), 404, "not_found")
  })
})
