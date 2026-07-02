/**
 * Contratos TypeBox da feature Contacts. `ContactResponse` é a saída única;
 * Create/Update são os inputs de escrita. E-mail/telefone opcionais porém
 * únicos no banco (409 conflict via SQLSTATE 23505).
 */
import { t } from "elysia"

import { PaginationQuery } from "../../../shared/domain/model"

export const ContactCreate = t.Object({
  name: t.String({ minLength: 1, maxLength: 200 }),
  email: t.Optional(t.Union([t.String({ format: "email" }), t.Null()])),
  phone: t.Optional(t.Union([t.String({ minLength: 5, maxLength: 20 }), t.Null()])),
})

/** Update parcial (PUT com semântica de patch — só o que vier muda). */
export const ContactUpdate = t.Partial(ContactCreate)

export const ContactResponse = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  email: t.Union([t.String(), t.Null()]),
  phone: t.Union([t.String(), t.Null()]),
  createdAt: t.Date(),
  updatedAt: t.Date(),
})

/** Busca livre `q` (nome/email/telefone) + paginação. */
export const ContactListQuery = t.Composite([
  t.Object({ q: t.Optional(t.String({ maxLength: 200 })) }),
  PaginationQuery,
])

export type ContactCreateInput = typeof ContactCreate.static
export type ContactUpdateInput = typeof ContactUpdate.static
export type ContactListQueryInput = typeof ContactListQuery.static
