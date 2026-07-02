/**
 * Wiring da feature CONTACTS (folder-by-endpoint): prefix + 1 rota → 1 função
 * livre. Zero lógica aqui — cada handler delega ao service do endpoint.
 */
import { Elysia, t } from "elysia"

import { database } from "../../shared/db"
import { IdParam } from "../../shared/domain/model"
import { ErrorResponse } from "../../shared/errors/model"
import { createContact } from "./create-contact/create-contact.service"
import { deleteContact } from "./delete-contact/delete-contact.service"
import { getContact } from "./get-contact/get-contact.service"
import { listContacts } from "./list-contacts/list-contacts.service"
import { ContactCreate, ContactListQuery, ContactResponse, ContactUpdate } from "./shared/model"
import { toContactResponse } from "./shared/serialize"
import { updateContact } from "./update-contact/update-contact.service"

export const contacts = new Elysia({ prefix: "/contacts", tags: ["Contacts"] })
  .use(database)
  .get(
    "/",
    async ({ db, query }) => (await listContacts(db, query)).map(toContactResponse),
    {
      query: ContactListQuery,
      response: { 200: t.Array(ContactResponse) },
      detail: { summary: "Lista contatos (busca livre por nome/email/telefone)" },
    },
  )
  .get(
    "/:id",
    async ({ db, params: { id }, status }) => {
      const row = await getContact(db, id)
      return row ? toContactResponse(row) : status(404, { error: "not_found" })
    },
    {
      params: IdParam,
      response: { 200: ContactResponse, 404: ErrorResponse },
      detail: { summary: "Detalha um contato" },
    },
  )
  .post(
    "/",
    async ({ db, body, status }) => {
      const { id } = await createContact(db, body)
      return status(201, toContactResponse((await getContact(db, id))!))
    },
    {
      body: ContactCreate,
      response: { 201: ContactResponse, 409: ErrorResponse, 422: ErrorResponse },
      detail: { summary: "Cria um contato (email/telefone únicos quando presentes)" },
    },
  )
  .put(
    "/:id",
    async ({ db, params: { id }, body, status }) => {
      const r = await updateContact(db, id, body)
      if (!r.ok) return status(404, { error: "not_found" })
      return toContactResponse((await getContact(db, id))!)
    },
    {
      params: IdParam,
      body: ContactUpdate,
      response: { 200: ContactResponse, 404: ErrorResponse, 409: ErrorResponse, 422: ErrorResponse },
      detail: { summary: "Atualiza um contato (parcial)" },
    },
  )
  .delete(
    "/:id",
    async ({ db, params: { id }, status }) => {
      const r = await deleteContact(db, id)
      if (!r.ok) return status(404, { error: "not_found" })
      return status(204, undefined)
    },
    {
      params: IdParam,
      response: { 204: t.Void(), 404: ErrorResponse, 422: ErrorResponse },
      detail: { summary: "Apaga um contato (bloqueado por FK se tiver cards)" },
    },
  )
