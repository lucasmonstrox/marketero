/**
 * Runner de migração:
 *   docker compose up -d   (na raiz, sobe o Postgres de dev)
 *   bun run db:migrate     (aqui)
 */
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import pg from "pg"

const { Pool } = pg
type PgPool = InstanceType<typeof Pool>

const DEV_DEFAULT_URL = "postgres://marketero:marketero@127.0.0.1:54320/marketero"
const MIGRATIONS_FOLDER = `${import.meta.dir}/../drizzle`

/**
 * Aplica as migrações Drizzle no `pool` dado. Reutilizável: usado pelo CLI
 * (`db:migrate`) e pela suíte de testes da API (provisiona o banco efêmero).
 */
export async function applyMigrations(pool: PgPool): Promise<void> {
  await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER })
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? DEV_DEFAULT_URL })
  await applyMigrations(pool)
  await pool.end()
  console.log("✅ migrações aplicadas.")
}

// Só roda como script (bun run src/migrate.ts) — não ao ser importado.
if (import.meta.main) {
  main().catch((err) => {
    console.error("❌ falha na migração:", err)
    process.exit(1)
  })
}
