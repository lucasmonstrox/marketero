/**
 * PUT /cards/:id — só campos NÃO-posicionais (título, valor, tags, intent,
 * responsável, custom, canal, contato). Mover é exclusivo do POST /:id/move —
 * um único caminho emite eventos, então nenhum movimento escapa da timeline.
 */
import { cards, type DB } from "@workspace/db"
import { eq } from "drizzle-orm"

import type { CardUpdateInput } from "../shared/model"

export type UpdateCardResult = { ok: true } | { ok: false; reason: "not_found" }

export async function updateCard(db: DB, id: string, input: CardUpdateInput): Promise<UpdateCardResult> {
  const [row] = await db
    .update(cards)
    .set({
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.valueCents !== undefined ? { valueCents: input.valueCents } : {}),
      ...(input.channel !== undefined ? { channel: input.channel } : {}),
      ...(input.intent !== undefined ? { intent: input.intent } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.assignedTo !== undefined ? { assignedTo: input.assignedTo } : {}),
      ...(input.custom !== undefined ? { custom: input.custom } : {}),
      ...(input.contactId !== undefined ? { contactId: input.contactId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(cards.id, id))
    .returning({ id: cards.id })
  return row ? { ok: true } : { ok: false, reason: "not_found" }
}
