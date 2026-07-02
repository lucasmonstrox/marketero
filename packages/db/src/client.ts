/**
 * Client Drizzle compartilhado (Postgres local de dev via Docker; Neon +
 * Hyperdrive em prod). Driver: node-postgres (`pg`) — decisão da arquitetura
 * (docs/referencia/arquitetura.md: TCP via Hyperdrive, não o WS do Neon).
 */
import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"

import * as schema from "./schemas/index"

const { Pool } = pg

const DEV_DEFAULT_URL = "postgres://marketero:marketero@127.0.0.1:54320/marketero"

// No workerd um socket pg NÃO pode ser reusado entre requests (a request
// "pendura"). `navigator.userAgent` é a sonda oficial do runtime.
const isWorkerd = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers"

// Lazy: no Cloudflare Workers o DATABASE_URL só existe quando o fetch recebe o
// env (worker.ts injeta env.HYPERDRIVE.connectionString em process.env). Criar o
// Pool no import leria a URL errada; o primeiro ACESSO é que constrói de verdade.
let _pool: pg.Pool | undefined
let _db: ReturnType<typeof buildDb> | undefined

function buildPool(): pg.Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL ?? DEV_DEFAULT_URL,
    max: 8,
    // falha rápido se o banco não estiver no ar, com folga pro cold start do
    // Neon atrás do Hyperdrive em prod.
    connectionTimeoutMillis: 15000,
    // permite o processo encerrar quando as conexões ficam ociosas (testes/CLI)
    allowExitOnIdle: true,
    // workerd: cada checkout abre conexão NOVA e a descarta ao soltar — nunca
    // reusa socket entre requests (senão pendura sob carga paralela). O
    // Hyperdrive na frente torna o reconnect barato. Fora do workerd, reusa.
    ...(isWorkerd ? { maxUses: 1, idleTimeoutMillis: 1000 } : {}),
  })
}

function buildDb() {
  return drizzle(getPool(), { schema })
}

export function getPool(): pg.Pool {
  _pool ??= buildPool()
  return _pool
}

function lazyProxy<T extends object>(get: () => T): T {
  return new Proxy({} as T, {
    get(_, prop) {
      const target = get() as Record<PropertyKey, unknown>
      const value = target[prop]
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value
    },
    has: (_, prop) => prop in (get() as object),
  })
}

export const pool = lazyProxy(getPool)

export const db = lazyProxy(() => (_db ??= buildDb()))

export type DB = ReturnType<typeof buildDb>
