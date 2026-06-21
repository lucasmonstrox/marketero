import { TooltipProvider } from "@workspace/ui/components/tooltip"

import { KanbanBoard } from "./_components/kanban-board"

/**
 * Funil Kanban estilo Bitrix24 (funcionalidades/kanban.md + design-system §7.3)
 * da tenant "Bella Decor" / operadora Ana Souza. Triggers MOVEM o card para a
 * etapa; robôs AGEM quando o card chega — a invariante central do produto.
 * Full-bleed: ocupa toda a altura do shell e gerencia a própria rolagem.
 */
export default function FunilPage() {
  return (
    <TooltipProvider delayDuration={200}>
      <KanbanBoard />
    </TooltipProvider>
  )
}
