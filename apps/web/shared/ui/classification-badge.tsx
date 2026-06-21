import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

import { type Intent, INTENT_META, TONE_BADGE } from "@/shared/domain/taxonomy"

/**
 * Chip da classificação de IA de um comentário/mensagem (inbox §7.2, funil §7.3).
 * Cor derivada da escala semântica (TONE_BADGE) — nunca um hue novo por
 * categoria. A cor nunca é o único portador de significado: o rótulo acompanha
 * (design-system §8.3).
 */
export function ClassificationBadge({
  intent,
  className,
}: {
  intent: Intent
  className?: string
}) {
  const meta = INTENT_META[intent]
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", TONE_BADGE[meta.tone], className)}
    >
      {meta.label}
    </Badge>
  )
}
