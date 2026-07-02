/**
 * Regras PURAS da feature Pipelines — sem DB, sem HTTP, 100% unit-testáveis.
 */

/**
 * Um conjunto de colunas iniciais é válido quando tem EXATAMENTE 1 `new` —
 * o pouso obrigatório de cards vindos de outro pipeline (kanban.md).
 * Retorna a mensagem do problema, ou null quando ok.
 */
export function validateStageSet(stageTypes: ReadonlyArray<string>): string | null {
  const news = stageTypes.filter((t) => t === "new").length
  if (news === 0) return "o conjunto de etapas precisa de 1 etapa type=new (porta de entrada)"
  if (news > 1) return `o conjunto de etapas só pode ter 1 etapa type=new (veio ${news})`
  return null
}

export type DeletePipelineCheck = { ok: true } | { ok: false; reason: "default_pipeline" | "has_cards" }

/**
 * Pipeline deletável = não-default E sem cards. O default é invariante do
 * produto; cards exigiriam decisão de destino que o DELETE não expressa.
 */
export function canDeletePipeline(isDefault: boolean, cardCount: number): DeletePipelineCheck {
  if (isDefault) return { ok: false, reason: "default_pipeline" }
  if (cardCount > 0) return { ok: false, reason: "has_cards" }
  return { ok: true }
}
