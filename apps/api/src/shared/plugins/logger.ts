/**
 * Log de request simples para dev (método + path). Em produção, trocar por
 * @elysiajs/opentelemetry / server-timing. `name` ativa dedupe.
 */
import { Elysia } from "elysia"

export const logger = new Elysia({ name: "plugin.logger" }).onRequest(({ request }) => {
  console.log(`→ ${request.method} ${new URL(request.url).pathname}`)
})
