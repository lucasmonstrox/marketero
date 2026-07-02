/**
 * PATCH /pipelines/:pipelineId/stages/reorder — recebe a lista COMPLETA de ids
 * na nova ordem e reindexa denso (0..n-1) numa transação. Permutação inválida
 * (id faltando/sobrando/duplicado) é rejeitada antes de tocar no banco.
 */
import { stages, type DB } from "@workspace/db"
import { eq } from "drizzle-orm"

import { validateReorder } from "../shared/rule"

export type ReorderStagesResult =
  | { ok: true }
  | { ok: false; reason: "pipeline_not_found" | "invalid_reorder"; detail?: string }

export async function reorderStages(db: DB, pipelineId: string, stageIds: string[]): Promise<ReorderStagesResult> {
  return db.transaction(async (tx) => {
    const current = await tx.select({ id: stages.id }).from(stages).where(eq(stages.pipelineId, pipelineId)).for("update")
    if (current.length === 0) return { ok: false, reason: "pipeline_not_found" as const }
    const invalid = validateReorder(stageIds, current.map((s) => s.id))
    if (invalid) return { ok: false, reason: "invalid_reorder" as const, detail: invalid }
    // Reindex denso: o índice no array É a nova position.
    for (const [position, id] of stageIds.entries()) {
      await tx.update(stages).set({ position, updatedAt: new Date() }).where(eq(stages.id, id))
    }
    return { ok: true as const }
  })
}
