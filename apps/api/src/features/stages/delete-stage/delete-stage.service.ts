/**
 * DELETE /stages/:id?moveCardsTo= — apaga a coluna. Com cards, exige destino
 * explícito; a migração é ATÔMICA (tudo ou nada) e emite `card.stage_changed`
 * POR card na mesma transação — o histórico não mente sobre onde o card esteve.
 */
import { cards, stages, type DB } from "@workspace/db"
import { asc, eq } from "drizzle-orm"

import { emitCardEvent } from "../../../shared/events"
import { isLastNewStage } from "../shared/rule"

export type DeleteStageResult =
  | { ok: true }
  | {
      ok: false
      reason: "not_found" | "last_new_stage" | "stage_has_cards" | "invalid_target" | "wip_limit_exceeded"
      detail?: string
    }

export async function deleteStage(db: DB, id: string, moveCardsTo?: string): Promise<DeleteStageResult> {
  return db.transaction(async (tx) => {
    const [target] = await tx.select().from(stages).where(eq(stages.id, id)).for("update")
    if (!target) return { ok: false, reason: "not_found" as const }
    // Nunca deletar a única porta de entrada do pipeline.
    const siblings = await tx
      .select({ id: stages.id, type: stages.type })
      .from(stages)
      .where(eq(stages.pipelineId, target.pipelineId))
    if (isLastNewStage(siblings, id)) return { ok: false, reason: "last_new_stage" as const }

    const orphans = await tx.select().from(cards).where(eq(cards.stageId, id)).orderBy(asc(cards.position))
    if (orphans.length > 0) {
      if (!moveCardsTo)
        return { ok: false, reason: "stage_has_cards" as const, detail: `${orphans.length} card(s) na coluna` }
      // Destino: existe, é OUTRA coluna e do MESMO pipeline.
      if (moveCardsTo === id) return { ok: false, reason: "invalid_target" as const, detail: "destino é a própria coluna" }
      const [dest] = await tx.select().from(stages).where(eq(stages.id, moveCardsTo)).for("update")
      if (!dest || dest.pipelineId !== target.pipelineId)
        return { ok: false, reason: "invalid_target" as const, detail: "destino inexistente ou de outro pipeline" }
      // WIP do destino considera o LOTE inteiro — ou todos cabem, ou nada migra.
      const destCards = await tx.select({ position: cards.position }).from(cards).where(eq(cards.stageId, dest.id))
      if (dest.wipLimit > 0 && destCards.length + orphans.length > dest.wipLimit)
        return { ok: false, reason: "wip_limit_exceeded" as const, detail: `wip ${dest.wipLimit} no destino` }
      // Migra preservando a ordem relativa (append no fim do destino, gaps de 1024).
      let position = destCards.length ? Math.max(...destCards.map((c) => c.position)) : 0
      for (const card of orphans) {
        position += 1024
        await tx
          .update(cards)
          .set({ stageId: dest.id, position, enteredStageAt: new Date(), updatedAt: new Date() })
          .where(eq(cards.id, card.id))
        await emitCardEvent(tx, card.id, {
          type: "card.stage_changed",
          payload: { from_stage_id: id, to_stage_id: dest.id, moved_by: null },
        })
      }
    }
    await tx.delete(stages).where(eq(stages.id, id))
    return { ok: true as const }
  })
}
