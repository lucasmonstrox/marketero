/**
 * PUT /stages/:id — nome, papel (type), WIP e acento. Position só via reorder.
 * Duas proteções de type: não tirar o único `new` do pipeline (last_new_stage)
 * e não criar um segundo `new` (duplicate_new_stage).
 * Reduzir wipLimit abaixo do count atual É permitido — não expulsa cards,
 * só bloqueia entradas futuras.
 */
import { stages, type DB } from "@workspace/db"
import { eq } from "drizzle-orm"

import type { StageUpdateInput } from "../shared/model"
import { isLastNewStage } from "../shared/rule"

export type UpdateStageResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "last_new_stage" | "duplicate_new_stage" }

export async function updateStage(db: DB, id: string, input: StageUpdateInput): Promise<UpdateStageResult> {
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: stages.id, pipelineId: stages.pipelineId, type: stages.type })
      .from(stages)
      .where(eq(stages.id, id))
      .for("update")
    if (!target) return { ok: false, reason: "not_found" as const }
    // Proteções só quando o type está de fato mudando.
    if (input.type !== undefined && input.type !== target.type) {
      const siblings = await tx
        .select({ id: stages.id, type: stages.type })
        .from(stages)
        .where(eq(stages.pipelineId, target.pipelineId))
      if (target.type === "new" && isLastNewStage(siblings, id))
        return { ok: false, reason: "last_new_stage" as const }
      if (input.type === "new" && siblings.some((s) => s.type === "new" && s.id !== id))
        return { ok: false, reason: "duplicate_new_stage" as const }
    }
    await tx
      .update(stages)
      .set({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.wipLimit !== undefined ? { wipLimit: input.wipLimit } : {}),
        ...(input.accent !== undefined ? { accent: input.accent } : {}),
        updatedAt: new Date(),
      })
      .where(eq(stages.id, id))
    return { ok: true as const }
  })
}
