/**
 * Entry de Cloudflare Workers. O Elysia expõe um handler fetch compatível com
 * o workerd — o Worker é só o adaptador. O servidor Bun continua em index.ts
 * (import.meta.main guard); este arquivo nunca roda sob Bun.
 */

/** Env do workerd: vars (strings) + binding do Hyperdrive. */
type WorkerEnv = Record<string, unknown> & { HYPERDRIVE?: { connectionString: string } }

export default {
  async fetch(request: Request, env: WorkerEnv) {
    // workerd entrega bindings via `env`, não via process.env — propaga antes
    // do primeiro handler tocar em process.env.
    for (const [k, v] of Object.entries(env)) {
      if (typeof v === "string" && process.env[k] === undefined) process.env[k] = v
    }
    // Hyperdrive vence qualquer DATABASE_URL: pooling quente até o Neon, e o
    // workerd não deixa o pg reusar conexão entre requests sem ele.
    if (env.HYPERDRIVE?.connectionString) process.env.DATABASE_URL = env.HYPERDRIVE.connectionString
    // Import preguiçoso: no escopo de módulo a avaliação dos schemas
    // (TypeBox/drizzle) estoura o limite de CPU de startup do deploy (10021).
    const handler = (application ??= (await import("./index")).app)
    return handler.fetch(request)
  },
}

let application: { fetch: (req: Request) => Promise<Response> | Response } | undefined
