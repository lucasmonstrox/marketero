/**
 * DELETE /pipelines/:id — apaga o kanban (stages cascateiam). Bloqueia o
 * default (invariante do produto) e pipelines com cards (o DELETE não expressa
 * para onde os negócios iriam).
 */
import { cards, pipelines, type DB } from "@workspace/db"
import { count, eq } from "drizzle-orm"

import { canDeletePipeline } from "../shared/rule"

export type DeletePipelineResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "default_pipeline" | "has_cards" }

export async function deletePipeline(db: DB, id: string): Promise<DeletePipelineResult> {
  return db.transaction(async (tx) => {
    const [p] = await tx
      .select({ isDefault: pipelines.isDefault })
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .for("update") // serializa contra um create-card concorrente no mesmo pipeline
    if (!p) return { ok: false, reason: "not_found" as const }
    const [n] = await tx.select({ n: count() }).from(cards).where(eq(cards.pipelineId, id))
    const check = canDeletePipeline(p.isDefault, Number(n?.n ?? 0))
    if (!check.ok) return { ok: false, reason: check.reason }
    await tx.delete(pipelines).where(eq(pipelines.id, id))
    return { ok: true as const }
  })
}
