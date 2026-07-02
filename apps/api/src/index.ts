/**
 * Root app da API HTTP do Marketero (Elysia + Bun).
 *
 * Compõe os plugins globais (logger, cors, openapi, errors, db) e monta cada
 * feature sob `/api/v1`. Cada feature é um controller-plugin isolado
 * (folder-by-feature em src/features/*). O `export type App` é consumido pelo
 * Eden Treaty em @workspace/api-client.
 */
import { Elysia } from "elysia"
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker"

import { cards } from "./features/cards"
import { contacts } from "./features/contacts"
import { pipelines } from "./features/pipelines"
import { stages } from "./features/stages"
import { database } from "./shared/db"
import { errors } from "./shared/errors"
import { corsPlugin } from "./shared/plugins/cors"
import { logger } from "./shared/plugins/logger"
import { openapiPlugin } from "./shared/plugins/openapi"

// No workerd usa o adapter oficial (Elysia ≥1.4.7); no Bun, adapter padrão.
const isWorkerd = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers"

// aot:false no workerd: o compile() (new Function) só pode rodar no startup,
// mas lá estoura o limite de CPU do deploy (10021) — modo dinâmico resolve.
export const app = new Elysia(isWorkerd ? { adapter: CloudflareAdapter, aot: false } : {})
  // Services podem devolver o query builder do drizzle sem await (thenable).
  // O modo dinâmico (aot:false, workerd) validaria o builder cru e estouraria —
  // este hook aguarda qualquer thenable antes da validação de resposta.
  .onAfterHandle({ as: "global" }, async ({ response }) => {
    if (response && typeof (response as { then?: unknown }).then === "function")
      return await (response as PromiseLike<unknown>)
  })
  .use(logger)
  .use(corsPlugin)
  .use(openapiPlugin)
  .use(errors)
  .use(database)
  .get("/", () => ({ name: "Marketero API", version: "0.1.0", docs: "/openapi" }), {
    detail: { summary: "Healthcheck / índice", tags: ["Pipelines"] },
  })
  .group("/api/v1", (app) => app.use(contacts).use(pipelines).use(stages).use(cards))

// Só sobe o servidor quando executado direto (não ao ser importado por testes/Eden).
if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3334)
  app.listen(port)
  console.log(`🦊 API do Marketero em http://localhost:${app.server?.port} — docs em /openapi`)
}

export type App = typeof app
