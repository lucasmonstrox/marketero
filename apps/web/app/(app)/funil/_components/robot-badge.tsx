import { BotIcon, SparklesIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { ChannelIcon } from "@/shared/ui/channel-icon"

import { ROBOT_META, type RobotType } from "../_data/pipelines"

/**
 * Chip de ROBÔ (outbound): ação executada quando o card CHEGA/permanece na
 * etapa. Robôs de IA (GraphRAG) usam o accent de IA (sparkle + tinta --ai);
 * os operacionais usam o neutro de marca com ícone de robô. Distinto do
 * TriggerBadge (que move o card), por ícone, cor e direção.
 */
export function RobotBadge({
  type,
  className,
  muted = false,
}: {
  type: RobotType
  className?: string
  muted?: boolean
}) {
  const meta = ROBOT_META[type]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
        meta.ai
          ? "border-ai-border bg-ai/10 text-ai"
          : "border-border bg-secondary text-secondary-foreground",
        muted && "opacity-55 saturate-50",
        className
      )}
    >
      {meta.ai ? (
        <SparklesIcon className="size-3 shrink-0" aria-hidden />
      ) : meta.channel ? (
        <ChannelIcon channel={meta.channel} className="size-3 shrink-0" />
      ) : (
        <BotIcon className="size-3 shrink-0" aria-hidden />
      )}
      <span className="truncate">{meta.label}</span>
    </span>
  )
}
