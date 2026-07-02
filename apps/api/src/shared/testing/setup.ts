/**
 * Preload #2 da suíte de testes (ver bunfig.toml). Hooks GLOBAIS — rodam UMA
 * vez na run multi-arquivo inteira (semântica de preload do Bun):
 *
 *   beforeAll: sobe o container de teste → aplica migrations → seed default.
 *   afterAll:  fecha o pool da app e derruba o container (TEST_KEEP_DB=1 mantém).
 *
 * Ordem dos imports importa: o env.ts (preload #1) já apontou DATABASE_URL para
 * o banco de teste, então o `pool` do @workspace/db abaixo já nasce na 54321.
 */
import { pool } from "@workspace/db"
import { applyMigrations } from "@workspace/db/migrate"
import { seedDefaults } from "@workspace/db/seed"
import { afterAll, beforeAll } from "bun:test"

import { startTestDb, stopTestDb } from "./docker"

beforeAll(async () => {
  await startTestDb()
  await applyMigrations(pool)
  await seedDefaults(pool)
})

afterAll(async () => {
  await pool.end()
  await stopTestDb()
})
