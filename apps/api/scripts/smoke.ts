/**
 * Smoke de ponta a ponta contra o banco de DEV (54320) — exercita o fluxo real
 * do funil em processo (app.handle, sem rede): contato → card no kanban
 * default → move entre colunas → move cross-pipeline → timeline → limpeza.
 *
 *   docker compose up -d && bun run db:migrate && bun run db:seed   (uma vez)
 *   bun run smoke                                                   (aqui)
 */
import { app } from "../src/index"

type Json = Record<string, unknown>

/** Chama a API em processo e devolve o JSON (ou explode com o corpo cru). */
async function req<T = Json>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await app.handle(
    new Request(`http://localhost/api/v1${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
  const text = await res.text()
  if (res.status >= 400) throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

type Pipeline = { id: string; stages: Array<{ id: string; name: string }> }

const [def] = await req<Pipeline[]>("GET", "/pipelines")
if (!def) throw new Error("nenhum pipeline — rodou o db:seed?")

const contact = await req<{ id: string }>("POST", "/contacts", {
  name: "Smoke Maria",
  email: `smoke-${Math.random().toString(36).slice(2)}@ex.com`,
})
const card = await req<{ id: string; stageId: string }>("POST", "/cards", {
  pipelineId: def.id,
  contactId: contact.id,
  title: "Venda smoke",
  valueCents: 9900,
  channel: "whatsapp",
})
console.log("card criado na etapa:", def.stages.find((s) => s.id === card.stageId)?.name)

await req("POST", `/cards/${card.id}/move`, { toStageId: def.stages[2]!.id })
const p2 = await req<Pipeline>("POST", "/pipelines", {
  name: "Pós-venda smoke",
  stages: [
    { name: "Entrada", type: "new" },
    { name: "Feito", type: "won" },
  ],
})
await req("POST", `/cards/${card.id}/move`, { toPipelineId: p2.id })

const events = await req<Array<{ type: string }>>("GET", `/cards/${card.id}/events`)
console.log("timeline:", events.map((e) => e.type).join(" → "))

const board = await req<{ stages: Array<{ name: string; cards: unknown[] }> }>("GET", `/pipelines/${p2.id}/board`)
console.log("board destino:", board.stages.map((s) => `${s.name}(${s.cards.length})`).join(" | "))

// Deixa o banco de dev como estava.
await req("DELETE", `/cards/${card.id}`)
await req("DELETE", `/pipelines/${p2.id}`)
await req("DELETE", `/contacts/${contact.id}`)
console.log("✅ smoke ok (limpeza feita)")
process.exit(0)
