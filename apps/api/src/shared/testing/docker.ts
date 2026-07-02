/**
 * Ciclo de vida do Postgres de teste dedicado (docker-compose.test.yml), via
 * Docker CLI. Efêmero por padrão; `TEST_KEEP_DB=1` mantém o container no ar
 * entre runs (iteração rápida: o `up --wait` vira no-op e as migrations/seed
 * são idempotentes).
 */
import { resolve } from "node:path"

const COMPOSE_FILE = resolve(import.meta.dir, "../../../docker-compose.test.yml")
const KEEP = process.env.TEST_KEEP_DB === "1"

async function compose(args: string[], timeoutMs: number): Promise<void> {
  const proc = Bun.spawn(["docker", "compose", "-f", COMPOSE_FILE, ...args], { stdout: "pipe", stderr: "pipe" })
  const timer = setTimeout(() => proc.kill(), timeoutMs)
  const code = await proc.exited
  clearTimeout(timer)
  if (code !== 0) {
    const err = await new Response(proc.stderr).text()
    throw new Error(`docker compose ${args.join(" ")} falhou (code ${code}). Docker está rodando?\n${err}`)
  }
}

/** Sobe o container e bloqueia até o healthcheck (pg_isready) passar. */
export async function startTestDb(): Promise<void> {
  await compose(["up", "-d", "--wait"], 120_000)
}

/** Derruba o container + volume (a menos que TEST_KEEP_DB=1). */
export async function stopTestDb(): Promise<void> {
  if (KEEP) return
  await compose(["down", "-v"], 60_000)
}
