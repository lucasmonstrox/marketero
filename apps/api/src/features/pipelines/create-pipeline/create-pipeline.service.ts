/**
 * POST /pipelines — cria o kanban, opcionalmente já com as colunas iniciais
 * (positions densas 0..n-1). Nunca cria default (o default é único, do seed).
 */
import { pipelines, stages, type DB } from "@workspace/db"

import type { PipelineCreateInput } from "../shared/model"
import { validateStageSet } from "../shared/rule"

export type CreatePipelineResult =
  | { ok: true; id: string }
  | { ok: false; reason: "invalid_stage_set"; detail: string }

export async function createPipeline(db: DB, input: PipelineCreateInput): Promise<CreatePipelineResult> {
  // Regra pura antes de tocar no banco: com stages, exatamente 1 `new`.
  if (input.stages && input.stages.length > 0) {
    const invalid = validateStageSet(input.stages.map((s) => s.type))
    if (invalid) return { ok: false, reason: "invalid_stage_set", detail: invalid }
  }
  // Pipeline + colunas nascem juntos — ou inteiro, ou nada.
  const id = await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(pipelines)
      .values({ name: input.name.trim() })
      .returning({ id: pipelines.id })
    if (input.stages && input.stages.length > 0) {
      await tx.insert(stages).values(
        input.stages.map((s, position) => ({
          pipelineId: p!.id,
          name: s.name.trim(),
          type: s.type,
          wipLimit: s.wipLimit ?? 0,
          accent: s.accent ?? null,
          position,
        })),
      )
    }
    return p!.id
  })
  return { ok: true, id }
}
