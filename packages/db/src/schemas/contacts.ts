/**
 * `contacts` — a PESSOA, deduplicada. Um contact pode ter N cards (compras/
 * oportunidades) ao longo do tempo; deletar um contact com card apontando
 * falha por FK (proteção no engine, não só na aplicação).
 */
import { pgTable, text } from "drizzle-orm/pg-core"

import { id, timestamps } from "./_shared"

export const contacts = pgTable("contacts", {
  /** Identificador único do contato (PK). */
  id,
  /** Nome de exibição — único campo obrigatório. */
  name: text("name").notNull(),
  /** E-mail (opcional; unique quando presente — dedup por identidade). */
  email: text("email").unique(),
  /** Telefone E.164 (opcional; unique quando presente). */
  phone: text("phone").unique(),
  ...timestamps,
})

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
