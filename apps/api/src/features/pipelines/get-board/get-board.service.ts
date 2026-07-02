/**
 * GET /pipelines/:id/board — a visão do kanban inteira em UMA resposta:
 * colunas ordenadas por position, cards de cada coluna ordenados por position.
 * Coluna vazia vem com `cards: []` (a UI não trata buraco).
 */
import { cards, stages, type Card, type DB, type Pipeline, type Stage } from "@workspace/db"
import { asc } from "drizzle-orm"

export type Board = { pipeline: Pipeline; stages: Array<Stage & { cards: Card[] }> }

export async function getBoard(db: DB, id: string): Promise<Board | undefined> {
  const p = await db.query.pipelines.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      stages: {
        orderBy: asc(stages.position),
        with: { cards: { orderBy: asc(cards.position) } },
      },
    },
  })
  if (!p) return undefined
  const { stages: cols, ...pipeline } = p
  return { pipeline, stages: cols }
}
