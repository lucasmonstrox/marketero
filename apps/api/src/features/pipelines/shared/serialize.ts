/**
 * Read-model da feature Pipelines: linhas do Drizzle → DTOs do contrato.
 */
import type { Card, Pipeline, Stage } from "@workspace/db"

/** Stage → StageResponse (accent tipado no schema do banco; null explícito). */
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

/** Pipeline + stages (já ordenadas) → PipelineResponse. */
export function toPipelineResponse(row: Pipeline & { stages: Stage[] }) {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.isDefault,
    stages: row.stages.map(toStageResponse),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Card → resumo do board (sem custom/timestamps — o detalhe é da feature cards). */
export function toBoardCard(row: Card) {
  return {
    id: row.id,
    contactId: row.contactId,
    title: row.title,
    valueCents: row.valueCents,
    channel: row.channel,
    intent: row.intent ?? null,
    tags: row.tags,
    assignedTo: row.assignedTo ?? null,
    enteredStageAt: row.enteredStageAt,
    position: row.position,
  }
}
