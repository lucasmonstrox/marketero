/**
 * Barrel público de @workspace/db — schemas (tabelas + tipos inferidos) e
 * client (db/pool/DB). Consumidores: apps/api (e futuros workers).
 */
export * from "./schemas/index"
export { db, pool, getPool, type DB } from "./client"
