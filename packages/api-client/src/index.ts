/**
 * Cliente Eden Treaty da API Marketero — tipos end-to-end SEM codegen.
 *
 * O `type App` é exportado por @workspace/api (apps/api/src/index.ts). Como o
 * tipo cruza a fronteira via `import type` (zero runtime), o backend NÃO é
 * bundlado no web. IMPORTANTE: a cadeia de tipos do apps/api usa imports
 * relativos (sem path alias) — requisito do Eden no monorepo, senão a
 * inferência cai para `any` (guardado por eden.verify.ts).
 *
 * Uso no apps/web:
 *   import { api } from "@workspace/api-client"
 *   const { data } = await api.api.v1.pipelines.get()
 *   // `data` é tipado a partir do response schema TypeBox do servidor.
 */
import { treaty } from "@elysiajs/eden"
import type { App } from "@workspace/api"

/** Base URL da API. Em prod, defina NEXT_PUBLIC_API_URL. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334"

/** Cliente Eden tipado. Os caminhos espelham as rotas (api.api.v1.cards…). */
export const api = treaty<App>(API_URL)

export type { App }
