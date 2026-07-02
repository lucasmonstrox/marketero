import { ArrowDownToLineIcon, ClockIcon, SparklesIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { ChannelIcon } from "@/shared/ui/channel-icon"

import { TRIGGER_META, type TriggerType } from "../_lib/automations"

/**
 * Chip de TRIGGER (inbound): regra que MOVE o card para a etapa. Sempre com
 * seta-para-dentro para reforçar "entra na etapa". O ícone à esquerda revela a
 * origem do evento: canal real (ChannelIcon), IA (sparkle) ou timer (relógio).
 * Distinto do RobotBadge, que é outbound/ação.
 */
export function TriggerBadge({
  type,
  className,
  muted = false,
}: {
  type: TriggerType
  className?: string
  muted?: boolean
}) {
  const meta = TRIGGER_META[type]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
        "border-info/30 bg-info/10 text-info",
        muted && "opacity-55 saturate-50",
        className
      )}
    >
      <ArrowDownToLineIcon className="size-3 shrink-0" aria-hidden />
      {meta.source === "channel" && meta.channel ? (
        <ChannelIcon channel={meta.channel} className="size-3 shrink-0" />
      ) : meta.source === "ai" ? (
        <SparklesIcon className="text-ai size-3 shrink-0" aria-hidden />
      ) : (
        <ClockIcon className="size-3 shrink-0" aria-hidden />
      )}
      <span className="truncate">{meta.label}</span>
    </span>
  )
}
