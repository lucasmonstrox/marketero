/**
 * POST /cards — cria o negócio no fim da coluna (default: a etapa type=new do
 * pipeline). INSERT + evento `card.created` na MESMA transação; WIP do destino
 * é checado sob lock — card que estoura o limite não existe nem por um instante.
 */
import { cards, stages, type DB } from "@workspace/db"
import { count, eq, max } from "drizzle-orm"

import { emitCardEvent } from "../../../shared/events"
import type { CardCreateInput } from "../shared/model"
import { landingStage, POSITION_GAP, wipExceeded } from "../shared/rule"

export type CreateCardResult =
  | { ok: true; id: string }
  | {
      ok: false
      reason: "pipeline_not_found" | "stage_not_in_pipeline" | "no_landing_stage" | "wip_limit_exceeded"
    }

export async function createCard(db: DB, input: CardCreateInput): Promise<CreateCardResult> {
  return db.transaction(async (tx) => {
    // Colunas do pipeline: valida existência + resolve a coluna inicial.
    const cols = await tx
      .select({ id: stages.id, type: stages.type })
      .from(stages)
      .where(eq(stages.pipelineId, input.pipelineId))
    if (cols.length === 0) return { ok: false, reason: "pipeline_not_found" as const }
    const landing = landingStage(cols, input.stageId)
    if (!landing.ok) return { ok: false, reason: landing.reason }

    // Lock da coluna destino serializa creates/moves concorrentes (WIP anti-corrida).
    const [dest] = await tx.select().from(stages).where(eq(stages.id, landing.stageId)).for("update")
    const [agg] = await tx
      .select({ n: count(), maxPos: max(cards.position) })
      .from(cards)
      .where(eq(cards.stageId, landing.stageId))
    if (wipExceeded(dest!.wipLimit, Number(agg?.n ?? 0))) return { ok: false, reason: "wip_limit_exceeded" as const }

    const [row] = await tx
      .insert(cards)
      .values({
        pipelineId: input.pipelineId,
        stageId: landing.stageId,
        contactId: input.contactId,
        title: input.title.trim(),
        valueCents: input.valueCents ?? 0,
        channel: input.channel,
        intent: input.intent ?? null,
        tags: input.tags ?? [],
        assignedTo: input.assignedTo ?? null,
        custom: input.custom ?? null,
        // fim da coluna: último + GAP (coluna vazia → GAP)
        position: (agg?.maxPos ?? 0) + POSITION_GAP,
      })
      .returning({ id: cards.id })
    // Evento nasce na mesma transação do INSERT — atômico por construção.
    await emitCardEvent(tx, row!.id, {
      type: "card.created",
      payload: { pipeline_id: input.pipelineId, stage_id: landing.stageId, contact_id: input.contactId },
    })
    return { ok: true as const, id: row!.id }
  })
}
