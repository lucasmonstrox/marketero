/**
 * Colunas compartilhadas por todos os models — um só lugar define o formato
 * de PK e o par de timestamps, para nenhuma tabela divergir.
 */
import { timestamp, uuid } from "drizzle-orm/pg-core"

/** PK padrão: uuid gerado pelo Postgres (gen_random_uuid). */
export const id = uuid("id").primaryKey().defaultRandom()

/** Par createdAt/updatedAt com timezone — presente em toda tabela mutável. */
export const timestamps = {
  /** Quando o registro foi criado. */
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /** Última atualização (os services fazem `set({ updatedAt: new Date() })`). */
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}
