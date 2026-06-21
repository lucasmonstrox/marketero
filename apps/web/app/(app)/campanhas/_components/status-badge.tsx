import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

import { type SemanticTone, TONE_BADGE } from "@/shared/domain/taxonomy"

/**
 * Pill de status derivado da escala semântica (TONE_BADGE) — reuso entre
 * campanhas (Ativa/Rascunho/Pausada), forms (draft/active/archived) e agentes.
 * A cor nunca é o único sinal: o rótulo sempre acompanha (design-system §8.3).
 */
export function StatusBadge({
  label,
  tone,
  className,
}: {
  label: string
  tone: SemanticTone
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", TONE_BADGE[tone], className)}
    >
      {label}
    </Badge>
  )
}
