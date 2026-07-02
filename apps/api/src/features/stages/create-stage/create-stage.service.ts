/**
 * POST /pipelines/:pipelineId/stages — cria a coluna no fim do board.
 * Mantém a invariante "no máximo 1 type=new por pipeline": segunda porta de
 * entrada é ambiguidade de pouso (cross-pipeline move não saberia onde cair).
 */
import { stages, type DB } from "@workspace/db"
import { eq } from "drizzle-orm"

import type { StageCreateInput } from "../shared/model"
import { nextPosition } from "../shared/rule"

export type CreateStageResult =
  | { ok: true; id: string }
  | { ok: false; reason: "pipeline_not_found" | "duplicate_new_stage" }

export async function createStage(db: DB, pipelineId: string, input: StageCreateInput): Promise<CreateStageResult> {
  return db.transaction(async (tx) => {
    // Colunas atuais numa tacada: existência do pipeline + posições + invariante do new.
    const existing = await tx
      .select({ id: stages.id, type: stages.type, position: stages.position })
      .from(stages)
      .where(eq(stages.pipelineId, pipelineId))
    const pipelineExists =
      existing.length > 0 || (await tx.query.pipelines.findFirst({ where: (p, { eq: e }) => e(p.id, pipelineId) }))
    if (!pipelineExists) return { ok: false, reason: "pipeline_not_found" as const }
    if (input.type === "new" && existing.some((s) => s.type === "new"))
      return { ok: false, reason: "duplicate_new_stage" as const }
    const [row] = await tx
      .insert(stages)
      .values({
        pipelineId,
        name: input.name.trim(),
        type: input.type,
        wipLimit: input.wipLimit ?? 0,
        accent: input.accent ?? null,
        position: nextPosition(existing.map((s) => s.position)),
      })
      .returning({ id: stages.id })
    return { ok: true as const, id: row!.id }
  })
}
