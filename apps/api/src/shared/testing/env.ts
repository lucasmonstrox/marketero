/**
 * Preload #1 da suíte de testes (ver bunfig.toml → [test] preload).
 *
 * Roda ANTES de qualquer import que carregue o `@workspace/db` — cujo `pool`
 * lê `DATABASE_URL` no primeiro acesso. Aqui forçamos a URL para o Postgres de
 * TESTE (container dedicado na 54321), NUNCA o banco de dev (54320).
 * `TEST_DATABASE_URL` permite apontar para outro alvo (CI).
 */
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://marketero:marketero@127.0.0.1:54321/marketero"
