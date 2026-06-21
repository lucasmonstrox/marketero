import { cn } from "@workspace/ui/lib/utils"

import { type SemanticTone, TONE_BADGE } from "@/shared/domain/taxonomy"

/**
 * Chip de status "soft" derivado do tom semântico (TONE_BADGE) — reutilizado por
 * canais, plano, DNS e webhooks. O rótulo textual é o sinal primário; a cor
 * apenas reforça (nunca é o único sinal). Um ponto opcional dá leitura rápida.
 */
export function StatusBadge({
  tone,
  label,
  dot = true,
  className,
}: {
  tone: SemanticTone
  label: string
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE_BADGE[tone],
        className
      )}
    >
      {dot ? (
        <span
          className={cn("size-1.5 rounded-full", DOT_BG[tone])}
          aria-hidden
        />
      ) : null}
      {label}
    </span>
  )
}

const DOT_BG: Record<SemanticTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
}
