/** Integração — POST /contacts (Postgres efêmero real). */
import { beforeEach, describe, expect, test } from "bun:test"

import { expectError, json, request, resetDb } from "../../../shared/testing/harness"

describe("POST /contacts", () => {
  beforeEach(resetDb)

  test("cria e devolve o contrato completo", async () => {
    const res = await request("POST", "/contacts", { name: "Maria Silva", email: "maria@ex.com", phone: "+5511999998888" })
    expect(res.status).toBe(201)
    const body = await json<{ id: string; name: string; email: string; phone: string }>(res)
    expect(body.name).toBe("Maria Silva")
    expect(body.email).toBe("maria@ex.com")
  })

  test("email duplicado → 409 conflict (unique do engine)", async () => {
    await request("POST", "/contacts", { name: "A", email: "dup@ex.com" })
    const res = await request("POST", "/contacts", { name: "B", email: "dup@ex.com" })
    await expectError(res, 409, "conflict")
  })

  test("body inválido (sem name) → 422 validation", async () => {
    const res = await request("POST", "/contacts", { email: "x@ex.com" })
    await expectError(res, 422, "validation")
  })
})
