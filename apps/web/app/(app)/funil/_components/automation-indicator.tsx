import {
  CheckCircle2Icon,
  CircleIcon,
  LoaderIcon,
  TimerIcon,
  TriangleAlertIcon,
  XCircleIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import {
  AUTOMATION_META,
  type AutomationState,
  TONE_BADGE,
} from "@/shared/domain/taxonomy"

const ICONS: Record<AutomationState, typeof CircleIcon> = {
  idle: CircleIcon,
  running: LoaderIcon,
  waiting: TimerIcon,
  escalated: TriangleAlertIcon,
  failed: XCircleIcon,
  completed: CheckCircle2Icon,
}

/**
 * Indicador do estado de automação de um card (AUTOMATION_META). Cor derivada
 * da escala semântica via TONE_BADGE — nunca um hue novo. "Executando" pulsa
 * (spin), "Aguardando" mostra o timer/SLA armado. O rótulo acompanha sempre a
 * cor (a11y: cor nunca é o único portador de significado).
 */
export function AutomationIndicator({
  state,
  detail,
  className,
}: {
  state: AutomationState
  detail?: string
  className?: string
}) {
  const meta = AUTOMATION_META[state]
  const Icon = ICONS[state]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
        TONE_BADGE[meta.tone],
        className
      )}
    >
      <Icon
        className={cn(
          "size-3 shrink-0",
          state === "running" && "animate-spin"
        )}
        aria-hidden
      />
      <span className="truncate">{detail ?? meta.label}</span>
    </span>
  )
}
