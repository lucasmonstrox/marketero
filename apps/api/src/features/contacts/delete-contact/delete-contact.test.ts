/** Integração — DELETE /contacts/:id (proteção por FK no engine). */
import { beforeEach, describe, expect, test } from "bun:test"

import { dbCount, expectError, makeCard, makeContact, makePipeline, request, resetDb } from "../../../shared/testing/harness"

describe("DELETE /contacts/:id", () => {
  beforeEach(resetDb)

  test("sem cards → 204 e some do banco", async () => {
    const { id } = await makeContact()
    const res = await request("DELETE", `/contacts/${id}`)
    expect(res.status).toBe(204)
    expect(await dbCount("contacts", "id = $1", [id])).toBe(0)
  })

  test("com card apontando → 422 fk_violation e contato intacto", async () => {
    const contact = await makeContact()
    const p = await makePipeline()
    await makeCard({ pipelineId: p.id, stageId: p.stageIds[0]!, contactId: contact.id })
    await expectError(await request("DELETE", `/contacts/${contact.id}`), 422, "fk_violation")
    expect(await dbCount("contacts", "id = $1", [contact.id])).toBe(1)
  })

  test("inexistente → 404", async () => {
    await expectError(await request("DELETE", "/contacts/00000000-0000-0000-0000-000000000000"), 404, "not_found")
  })
})
