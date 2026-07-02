/**
 * Read-model da feature Cards: linhas do Drizzle → DTOs do contrato.
 */
import type { Card, CardEvent } from "@workspace/db"

/** Card → CardResponse (nulls explícitos; custom tipado como record no boundary). */
export function toCardResponse(row: Card) {
  return {
    id: row.id,
    pipelineId: row.pipelineId,
    stageId: row.stageId,
    contactId: row.contactId,
    title: row.title,
    valueCents: row.valueCents,
    channel: row.channel,
    intent: row.intent ?? null,
    tags: row.tags,
    assignedTo: row.assignedTo ?? null,
    enteredStageAt: row.enteredStageAt,
    position: row.position,
    custom: (row.custom as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Evento → timeline. `seq` (bigint do driver) vira number — seguro < 2^53. */
export function toCardEventResponse(row: CardEvent) {
  return {
    id: row.id,
    type: row.type,
    payload: row.payload as Record<string, unknown>,
    seq: Number(row.seq),
    occurredAt: row.occurredAt,
  }
}
