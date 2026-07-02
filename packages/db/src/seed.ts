/**
 * Seed do KANBAN DEFAULT: pipeline "Funil de Vendas" (is_default) com as 5
 * etapas canônicas do docs/funcionalidades/kanban.md. Idempotente — a âncora
 * é o unique parcial de is_default: se já existe um default, é no-op.
 *
 * Reutilizável: usado pelo CLI (`db:seed`) e pelo setup da suíte de testes.
 */
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"

import { pipelines, stages, type StageAccent } from "./schemas/index"
import * as schema from "./schemas/index"

const { Pool } = pg
type PgPool = InstanceType<typeof Pool>

const DEV_DEFAULT_URL = "postgres://marketero:marketero@127.0.0.1:54320/marketero"

/** As 5 etapas canônicas (nome exibido, papel no funil, acento visual). */
const DEFAULT_STAGES: ReadonlyArray<{ name: string; type: "new" | "active" | "won" | "lost"; accent: StageAccent }> = [
  { name: "Novo", type: "new", accent: { kind: "chart", n: 1 } },
  { name: "Contato feito", type: "active", accent: { kind: "chart", n: 2 } },
  { name: "Qualificado", type: "active", accent: { kind: "chart", n: 3 } },
  { name: "Ganho", type: "won", accent: { kind: "tone", tone: "success" } },
  { name: "Perdido", type: "lost", accent: { kind: "tone", tone: "destructive" } },
]

/** Garante o pipeline default. Devolve o id (existente ou recém-criado). */
export async function seedDefaults(pool: PgPool): Promise<string> {
  const db = drizzle(pool, { schema })
  // Já existe um default? (unique parcial garante que é no máximo 1)
  const existing = await db.select({ id: pipelines.id }).from(pipelines).where(eq(pipelines.isDefault, true))
  if (existing[0]) return existing[0].id
  // Cria pipeline + etapas numa transação — ou nasce inteiro, ou não nasce.
  return db.transaction(async (tx) => {
    const [p] = await tx
      .insert(pipelines)
      .values({ name: "Funil de Vendas", isDefault: true })
      .returning({ id: pipelines.id })
    await tx.insert(stages).values(
      DEFAULT_STAGES.map((s, position) => ({ pipelineId: p!.id, position, ...s })),
    )
    return p!.id
  })
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? DEV_DEFAULT_URL })
  const id = await seedDefaults(pool)
  await pool.end()
  console.log(`✅ seed ok — pipeline default: ${id}`)
}

// Só roda como script (bun run db:seed) — não ao ser importado pelos testes.
if (import.meta.main) {
  main().catch((err) => {
    console.error("❌ falha no seed:", err)
    process.exit(1)
  })
}
