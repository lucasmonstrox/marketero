/**
 * Harness dos testes da API — bate no Elysia EM PROCESSO (`app.handle`, sem
 * rede) contra o Postgres de TESTE (container dedicado; ver setup.ts/docker.ts).
 *
 * Factories inserem linhas REAIS (sem mock de repository); os asserts diretos
 * no banco (dbCount/dbColumn/cardEventsOf) provam efeitos que a resposta HTTP
 * não mostra (atomicidade, eventos emitidos, posições reindexadas).
 */
import {
  cardEvents,
  cards,
  contacts,
  db,
  pipelines,
  pool,
  stages,
  type Card,
  type NewCard,
  type NewStage,
} from "@workspace/db"
import { asc, eq } from "drizzle-orm"
import { expect } from "bun:test"

import { app } from "../../index"

export { db, pool }

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

/** Chama a API em processo. `path` é relativo a `/api/v1` (ex.: "/cards"). */
export function request(method: Method, path: string, body?: unknown): Promise<Response> {
  return app.handle(
    new Request(`http://localhost/api/v1${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
}

/** Açúcar: parse + cast da resposta JSON. */
export async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T
}

/** Valida o envelope de erro padrão (`{ error, detail? }`) + o status. Devolve o corpo. */
export async function expectError(
  res: Response,
  expectedStatus: number,
  code: string,
): Promise<{ error: string; detail?: string }> {
  expect(res.status).toBe(expectedStatus)
  const body = await json<{ error: string; detail?: string }>(res)
  expect(body.error).toBe(code)
  return body
}

// ── Factories (linhas reais no Postgres de teste) ────────────────────────────
let seq = 0

/** Contato mínimo. `seq` garante email/phone únicos entre testes. */
export async function makeContact(over: { name?: string; email?: string; phone?: string } = {}): Promise<{
  id: string
}> {
  seq++
  const [c] = await db
    .insert(contacts)
    .values({
      name: over.name ?? `Contato E2E ${seq}`,
      email: over.email ?? `e2e-${seq}@test.local`,
      phone: over.phone ?? `+5500${String(seq).padStart(9, "0")}`,
    })
    .returning({ id: contacts.id })
  return { id: c!.id }
}

/** Pipeline + stages. Default: as 5 etapas canônicas (1 new, 2 active, won, lost). */
export async function makePipeline(
  over: { name?: string; stages?: Array<Pick<NewStage, "name" | "type"> & Partial<NewStage>> } = {},
): Promise<{ id: string; stageIds: string[] }> {
  seq++
  const stageDefs = over.stages ?? [
    { name: "Novo", type: "new" as const },
    { name: "Contato", type: "active" as const },
    { name: "Qualificado", type: "active" as const },
    { name: "Ganho", type: "won" as const },
    { name: "Perdido", type: "lost" as const },
  ]
  const [p] = await db
    .insert(pipelines)
    .values({ name: over.name ?? `Pipeline E2E ${seq}` })
    .returning({ id: pipelines.id })
  const inserted = await db
    .insert(stages)
    .values(stageDefs.map((s, position) => ({ position, ...s, pipelineId: p!.id })))
    .returning({ id: stages.id })
  return { id: p!.id, stageIds: inserted.map((s) => s.id) }
}

/** Coluna avulsa num pipeline existente (position = informada ou fim). */
export async function makeStage(
  pipelineId: string,
  over: Partial<NewStage> & { name?: string } = {},
): Promise<{ id: string }> {
  seq++
  const existing = await db.select({ position: stages.position }).from(stages).where(eq(stages.pipelineId, pipelineId))
  const position = over.position ?? (existing.length ? Math.max(...existing.map((s) => s.position)) + 1 : 0)
  const [s] = await db
    .insert(stages)
    .values({ name: over.name ?? `Etapa E2E ${seq}`, type: over.type ?? "active", ...over, pipelineId, position })
    .returning({ id: stages.id })
  return { id: s!.id }
}

/** Card direto no banco (SEM evento — para testes que contam eventos do zero, use a API). */
export async function makeCard(
  over: Partial<NewCard> & { pipelineId: string; stageId: string; contactId?: string },
): Promise<{ id: string }> {
  seq++
  const contactId = over.contactId ?? (await makeContact()).id
  const existing = await db.select({ position: cards.position }).from(cards).where(eq(cards.stageId, over.stageId))
  const position = over.position ?? (existing.length ? Math.max(...existing.map((c) => c.position)) + 1024 : 1024)
  const [c] = await db
    .insert(cards)
    .values({
      title: over.title ?? `Card E2E ${seq}`,
      channel: over.channel ?? "whatsapp",
      ...over,
      contactId,
      position,
    })
    .returning({ id: cards.id })
  return { id: c!.id }
}

// ── Asserts diretos no banco (não confiar só na resposta HTTP) ──────────────
/** Contagem genérica via SQL cru — prova "A mudou / B intacto" sem passar pela API. */
export async function dbCount(table: string, where: string, params: unknown[]): Promise<number> {
  const r = await pool.query<{ n: number }>(`select count(*)::int as n from ${table} where ${where}`, params)
  return Number(r.rows[0]?.n ?? 0)
}

/** Lê uma coluna de uma linha por id (ex.: stage_id atual de um card). */
export async function dbColumn<T>(table: string, column: string, id: string): Promise<T | undefined> {
  const r = await pool.query(`select ${column} as v from ${table} where id = $1`, [id])
  return (r.rows[0] as { v: T } | undefined)?.v
}

/** Card completo direto do banco (assert de posição/entered_stage_at). */
export async function dbCard(id: string): Promise<Card | undefined> {
  const rows = await db.select().from(cards).where(eq(cards.id, id))
  return rows[0]
}

/** Timeline crua do card (ORDER BY seq) — prova quais eventos foram emitidos. */
export async function cardEventsOf(cardId: string): Promise<Array<{ type: string; payload: unknown }>> {
  return db
    .select({ type: cardEvents.type, payload: cardEvents.payload })
    .from(cardEvents)
    .where(eq(cardEvents.cardId, cardId))
    .orderBy(asc(cardEvents.seq))
}

/**
 * Limpa o estado entre testes: apaga cards (eventos cascateiam), pipelines
 * NÃO-default (stages cascateiam) e contacts. PRESERVA o pipeline default do
 * seed (e suas etapas) — ele é invariante do produto, não fixture.
 */
export async function resetDb(): Promise<void> {
  await pool.query("delete from cards")
  await pool.query("delete from pipelines where is_default = false")
  await pool.query("delete from contacts")
}
