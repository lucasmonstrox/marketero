/**
 * GET /pipelines — todos os kanbans com suas colunas ordenadas. Default
 * primeiro (é o board de pouso da UI), depois por criação.
 */
import { pipelines, stages, type DB, type Pipeline, type Stage } from "@workspace/db"
import { asc, desc } from "drizzle-orm"

export async function listPipelines(db: DB): Promise<Array<Pipeline & { stages: Stage[] }>> {
  return db.query.pipelines.findMany({
    with: { stages: { orderBy: asc(stages.position) } },
    orderBy: [desc(pipelines.isDefault), asc(pipelines.createdAt)],
  })
}
