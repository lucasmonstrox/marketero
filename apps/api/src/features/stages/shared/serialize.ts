/**
 * Read-model da feature Stages: linha do Drizzle → DTO do contrato.
 */
import type { Stage } from "@workspace/db"

/** Stage → StageResponse (null explícito no accent). */
export function toStageResponse(row: Stage) {
  return {
    id: row.id,
    pipelineId: row.pipelineId,
    name: row.name,
    position: row.position,
    type: row.type,
    wipLimit: row.wipLimit,
    accent: row.accent ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
