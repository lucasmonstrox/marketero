/**
 * `stages` — a COLUNA do kanban. Ordenada por `position` (reindex denso no
 * reorder); todo pipeline precisa manter exatamente 1 stage `type=new`
 * (invariante protegida nos services — é o pouso de moves cross-pipeline).
 */
import { index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core"

import { stageType } from "./_enums"
import { id, timestamps } from "./_shared"
import { pipelines } from "./pipelines"

/** Preferência visual da coluna (espelho de StageAccent do web) — não é domínio.
 *  `n` fica largo aqui de propósito: a faixa 1..5 é validada no boundary HTTP. */
export type StageAccent = { kind: "chart"; n: number } | { kind: "tone"; tone: string }

export const stages = pgTable(
  "stages",
  {
    /** Identificador único da etapa (PK). */
    id,
    /** Pipeline dono — apagar o pipeline (vazio) leva as colunas junto. */
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    /** Nome da coluna (ex.: "Qualificado"). */
    name: text("name").notNull(),
    /** Ordem da coluna no board (0..n-1, densa — sem unique: reindex transitório). */
    position: integer("position").notNull(),
    /** Papel no funil: new (entrada) / active / won / lost (absorventes). */
    type: stageType("type").notNull(),
    /** Limite WIP da coluna; 0 = sem limite. Excedente bloqueia create/move (422). */
    wipLimit: integer("wip_limit").notNull().default(0),
    /** Cor/acento visual da coluna (jsonb livre — validado no boundary HTTP). */
    accent: jsonb("accent").$type<StageAccent | null>(),
    ...timestamps,
  },
  (t) => [index("stages_pipeline_position_idx").on(t.pipelineId, t.position)],
)

export type Stage = typeof stages.$inferSelect
export type NewStage = typeof stages.$inferInsert
