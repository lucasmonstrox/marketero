/**
 * Regras PURAS da feature Cards — sem DB, sem HTTP, 100% unit-testáveis.
 * Aqui mora a coreografia de posição/WIP/pouso que o move-card orquestra.
 */

/** Gap padrão entre cards: sobra espaço pra ~10 inserções no meio antes de reindexar. */
export const POSITION_GAP = 1024

export type PositionResult = { kind: "position"; position: number } | { kind: "reindex" }

/**
 * Posição de um card entre os vizinhos `prev` e `next` (null = borda):
 * fim vazio → GAP; fim → prev+GAP; início → next−GAP; meio → média.
 * Gap esgotado (next−prev ≤ 1) → sinaliza reindex (o service reindexa a coluna
 * inteira na MESMA transação e tenta de novo).
 */
export function computePosition(prev: number | null, next: number | null): PositionResult {
  if (prev === null && next === null) return { kind: "position", position: POSITION_GAP }
  if (prev === null) return { kind: "position", position: next! - POSITION_GAP }
  if (next === null) return { kind: "position", position: prev + POSITION_GAP }
  if (next - prev <= 1) return { kind: "reindex" }
  return { kind: "position", position: Math.floor((prev + next) / 2) }
}

/** WIP excedido: `limit` 0 = ilimitado; `count` é o total ANTES da entrada. */
export function wipExceeded(limit: number, count: number): boolean {
  return limit > 0 && count >= limit
}

/**
 * Move para a própria coluna SEM position explícita = no-op absoluto
 * (nem UPDATE nem evento). Com position, é reorder dentro da coluna —
 * atualiza a posição mas NÃO é mudança de etapa (sem evento).
 */
export function isNoopMove(currentStageId: string, toStageId: string, position: number | undefined): boolean {
  return currentStageId === toStageId && position === undefined
}

type StageRef = { id: string; type: string }
export type LandingResult =
  | { ok: true; stageId: string }
  | { ok: false; reason: "no_landing_stage" | "stage_not_in_pipeline" }

/**
 * Resolve a coluna de POUSO num pipeline destino: o `explicitId` (se veio,
 * precisa pertencer ao conjunto) ou a única etapa type=new. Pipeline sem `new`
 * e sem destino explícito não tem onde pousar (kanban.md: nunca herda o stage
 * do pipeline de origem).
 */
export function landingStage(stagesOfPipeline: ReadonlyArray<StageRef>, explicitId?: string): LandingResult {
  if (explicitId) {
    return stagesOfPipeline.some((s) => s.id === explicitId)
      ? { ok: true, stageId: explicitId }
      : { ok: false, reason: "stage_not_in_pipeline" }
  }
  const entry = stagesOfPipeline.find((s) => s.type === "new")
  return entry ? { ok: true, stageId: entry.id } : { ok: false, reason: "no_landing_stage" }
}
