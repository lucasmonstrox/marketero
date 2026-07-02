/**
 * Regras PURAS da feature Stages — sem DB, sem HTTP, 100% unit-testáveis.
 */

type StageRef = { id: string; type: string }

/**
 * Este stage é o ÚNICO `type=new` do pipeline? Se sim, ele não pode ser
 * deletado nem mudar de type — todo pipeline com colunas mantém sua porta de
 * entrada (pouso de moves cross-pipeline, kanban.md).
 */
export function isLastNewStage(all: ReadonlyArray<StageRef>, stageId: string): boolean {
  const target = all.find((s) => s.id === stageId)
  if (!target || target.type !== "new") return false
  return all.filter((s) => s.type === "new").length === 1
}

/** Próxima position densa para uma coluna nova (fim do board). */
export function nextPosition(positions: ReadonlyArray<number>): number {
  return positions.length === 0 ? 0 : Math.max(...positions) + 1
}

/**
 * O reorder só aceita uma PERMUTAÇÃO exata das colunas atuais — id faltando,
 * sobrando ou duplicado é rejeitado (senão o board "perde" colunas em silêncio).
 * Retorna a mensagem do problema, ou null quando ok.
 */
export function validateReorder(ids: ReadonlyArray<string>, current: ReadonlyArray<string>): string | null {
  if (new Set(ids).size !== ids.length) return "stageIds contém id duplicado"
  if (ids.length !== current.length) return `esperava ${current.length} ids (veio ${ids.length})`
  const expected = new Set(current)
  const missing = ids.find((id) => !expected.has(id))
  if (missing) return `id não pertence ao pipeline: ${missing}`
  return null
}
