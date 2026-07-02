/**
 * `pipelines` — um KANBAN (funil). O tenant pode ter vários (Vendas,
 * Atendimento, Recuperação de carrinho…); exatamente UM é o default,
 * garantido por unique index parcial no engine.
 */
import { sql } from "drizzle-orm"
import { boolean, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core"

import { id, timestamps } from "./_shared"

export const pipelines = pgTable(
  "pipelines",
  {
    /** Identificador único do pipeline (PK). */
    id,
    /** Nome exibido no seletor de kanbans (ex.: "Funil de Vendas"). */
    name: text("name").notNull(),
    /** Kanban default do produto — indeletável; só 1 pode ser true. */
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    // Unique PARCIAL: o engine garante no máximo um default, mesmo sob corrida.
    uniqueIndex("pipelines_single_default_idx").on(t.isDefault).where(sql`is_default`),
  ],
)

export type Pipeline = typeof pipelines.$inferSelect
export type NewPipeline = typeof pipelines.$inferInsert
