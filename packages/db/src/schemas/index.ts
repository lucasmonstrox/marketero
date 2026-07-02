/**
 * Barrel dos schemas — alvo do drizzle.config.ts e fonte única do shape do
 * banco. Um arquivo por model (convenção do repo).
 */
export * from "./_enums"
// Domínio do funil
export * from "./contacts"
export * from "./pipelines"
export * from "./stages"
export * from "./cards"
export * from "./card-events"
// Grafo de relações (db.query.*)
export * from "./relations"
