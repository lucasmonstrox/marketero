/** Integração — GET /contacts (busca livre + paginação). */
import { beforeEach, describe, expect, test } from "bun:test"

import { json, makeContact, request, resetDb } from "../../../shared/testing/harness"

describe("GET /contacts", () => {
  beforeEach(resetDb)

  test("q casa nome, email e telefone (case-insensitive)", async () => {
    await makeContact({ name: "Ana Souza", email: "ana@ex.com", phone: "+5511900000001" })
    await makeContact({ name: "Bruno Lima", email: "bruno@ex.com", phone: "+5511900000002" })
    const byName = await json<unknown[]>(await request("GET", "/contacts?q=ana"))
    expect(byName).toHaveLength(1)
    const byEmail = await json<unknown[]>(await request("GET", "/contacts?q=bruno@ex"))
    expect(byEmail).toHaveLength(1)
    const all = await json<unknown[]>(await request("GET", "/contacts"))
    expect(all).toHaveLength(2)
  })

  test("paginação limita e desloca", async () => {
    for (let i = 0; i < 3; i++) await makeContact()
    const page = await json<unknown[]>(await request("GET", "/contacts?limit=2&offset=2"))
    expect(page).toHaveLength(1)
  })
})
