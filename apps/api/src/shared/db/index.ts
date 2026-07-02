/**
 * Plugin de banco: injeta o client Drizzle (singleton de @workspace/db) no
 * contexto de todo handler via `.decorate('db', db)`. O `name` ativa a
 * deduplicação do Elysia (uma instância só, mesmo usado por N features).
 * NÃO criar um novo Pool aqui — o `db` já encapsula o `pg.Pool` compartilhado.
 */
import { db, type DB } from "@workspace/db"
import { Elysia } from "elysia"

export const database = new Elysia({ name: "plugin.db" }).decorate("db", db)

export type { DB }
