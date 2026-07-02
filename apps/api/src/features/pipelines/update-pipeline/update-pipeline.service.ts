/**
 * PUT /pipelines/:id — só renomeia. `isDefault` é imutável em v1 (o default
 * nasce do seed e trocar o default é decisão de produto da v2).
 */
import { pipelines, type DB } from "@workspace/db"
import { eq } from "drizzle-orm"

import type { PipelineUpdateInput } from "../shared/model"

export type UpdatePipelineResult = { ok: true } | { ok: false; reason: "not_found" }

export async function updatePipeline(db: DB, id: string, input: PipelineUpdateInput): Promise<UpdatePipelineResult> {
  const [row] = await db
    .update(pipelines)
    .set({ name: input.name.trim(), updatedAt: new Date() })
    .where(eq(pipelines.id, id))
    .returning({ id: pipelines.id })
  return row ? { ok: true } : { ok: false, reason: "not_found" }
}
