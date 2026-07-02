/**
 * POST /cards/:id/move — o coração da v1. Em UMA transação:
 *   lock do card → resolve destino (cross-pipeline pousa no type=new, nunca
 *   herda o stage antigo) → no-op? → lock da coluna destino + WIP → posição
 *   (gap/média/reindex) → UPDATE (stage, pipeline, position, entered_stage_at)
 *   → eventos canônicos (`pipeline_changed` se cross + `stage_changed`).
 *
 * Mesmo stage com `position` = reorder dentro da coluna: atualiza a posição
 * SEM evento (não é mudança de etapa) e SEM resetar entered_stage_at.
 */
import { cards, stages, type DB } from "@workspace/db"
import { and, asc, eq, ne } from "drizzle-orm"

import { emitCardEvent, type Tx } from "../../../shared/events"
import type { MoveInput } from "../shared/model"
import { computePosition, isNoopMove, landingStage, wipExceeded } from "../shared/rule"

export type MoveCardResult =
  | { ok: true; moved: boolean }
  | {
      ok: false
      reason:
        | "not_found"
        | "missing_target"
        | "pipeline_not_found"
        | "stage_not_in_pipeline"
        | "no_landing_stage"
        | "wip_limit_exceeded"
    }

export async function moveCard(db: DB, id: string, input: MoveInput): Promise<MoveCardResult> {
  // Sem destino nenhum não há o que fazer — contrato exige stage OU pipeline.
  if (input.toStageId === undefined && input.toPipelineId === undefined)
    return { ok: false, reason: "missing_target" }
  return db.transaction(async (tx) => {
    const [card] = await tx.select().from(cards).where(eq(cards.id, id)).for("update")
    if (!card) return { ok: false, reason: "not_found" as const }

    // Resolve o pipeline destino (default: o atual) e a coluna de pouso.
    const toPipelineId = input.toPipelineId ?? card.pipelineId
    const cols = await tx
      .select({ id: stages.id, type: stages.type })
      .from(stages)
      .where(eq(stages.pipelineId, toPipelineId))
    if (cols.length === 0) return { ok: false, reason: "pipeline_not_found" as const }
    const landing = landingStage(cols, input.toStageId)
    if (!landing.ok) return { ok: false, reason: landing.reason }

    // No-op absoluto: mesma coluna, sem position → nem UPDATE nem evento.
    if (isNoopMove(card.stageId, landing.stageId, input.position)) return { ok: true as const, moved: false }

    const crossPipeline = toPipelineId !== card.pipelineId
    const sameStage = landing.stageId === card.stageId

    // WIP só conta na ENTRADA em outra coluna (reorder interno não muda o count).
    if (!sameStage) {
      const [dest] = await tx.select().from(stages).where(eq(stages.id, landing.stageId)).for("update")
      const occupants = await tx
        .select({ n: cards.id })
        .from(cards)
        .where(and(eq(cards.stageId, landing.stageId), ne(cards.id, id)))
      if (wipExceeded(dest!.wipLimit, occupants.length)) return { ok: false, reason: "wip_limit_exceeded" as const }
    }

    const position = await resolvePosition(tx, landing.stageId, id, input.position)
    await tx
      .update(cards)
      .set({
        stageId: landing.stageId,
        pipelineId: toPipelineId,
        position,
        // O relógio do "há quanto tempo na etapa" só reseta em mudança de etapa.
        ...(sameStage ? {} : { enteredStageAt: new Date() }),
        updatedAt: new Date(),
      })
      .where(eq(cards.id, id))

    // Eventos na mesma transação, na ordem causal: pipeline mudou → etapa mudou.
    if (crossPipeline) {
      await emitCardEvent(tx, id, {
        type: "card.pipeline_changed",
        payload: { from_pipeline_id: card.pipelineId, to_pipeline_id: toPipelineId, landing_stage_id: landing.stageId },
      })
    }
    if (!sameStage) {
      await emitCardEvent(tx, id, {
        type: "card.stage_changed",
        payload: { from_stage_id: card.stageId, to_stage_id: landing.stageId, moved_by: null },
      })
    }
    return { ok: true as const, moved: true }
  })
}

/**
 * Posição final na coluna destino: a pedida (drag & drop) ou o fim. Se o gap
 * entre vizinhos esgotou, reindexa a coluna inteira (gaps de 1024) NA MESMA
 * transação e recalcula — o chamador nunca vê estado intermediário.
 */
async function resolvePosition(tx: Tx, stageId: string, movingCardId: string, requested?: number): Promise<number> {
  const others = await tx
    .select({ id: cards.id, position: cards.position })
    .from(cards)
    .where(and(eq(cards.stageId, stageId), ne(cards.id, movingCardId)))
    .orderBy(asc(cards.position))
  // Sem pedido explícito: fim da coluna.
  if (requested === undefined) {
    const last = others.at(-1)
    return (last?.position ?? 0) + 1024
  }
  // Vizinhos da posição pedida: o card cai ENTRE prev (< requested) e next (≥ requested).
  // `k` = quantos ficam antes — sobrevive ao reindex (é ordinal, não posicional).
  const k = others.filter((c) => c.position < requested).length
  const prev = k > 0 ? others[k - 1]!.position : null
  const next = k < others.length ? others[k]!.position : null
  const result = computePosition(prev, next)
  if (result.kind === "position") return result.position
  // Gap esgotado: reindex denso em gaps de 1024 e recalcula pelo MESMO ordinal.
  for (const [i, c] of others.entries()) {
    await tx.update(cards).set({ position: (i + 1) * 1024 }).where(eq(cards.id, c.id))
  }
  const retry = computePosition(k > 0 ? k * 1024 : null, k < others.length ? (k + 1) * 1024 : null)
  // Pós-reindex os gaps são 1024 — computePosition sempre resolve.
  return retry.kind === "position" ? retry.position : (k + 1) * 1024 - 512
}
