/**
 * GET /pipelines/:id — detalhe com colunas ordenadas. `undefined` = 404.
 */
import { stages, type DB, type Pipeline, type Stage } from "@workspace/db"
import { asc } from "drizzle-orm"

export async function getPipeline(db: DB, id: string): Promise<(Pipeline & { stages: Stage[] }) | undefined> {
  return db.query.pipelines.findFirst({
    where: (p, { eq }) => eq(p.id, id),
    with: { stages: { orderBy: asc(stages.position) } },
  })
}
