"use client"

import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVerticalIcon } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { AiTag } from "@/shared/ui/ai-tag"
import { ChannelIcon } from "@/shared/ui/channel-icon"
import { ClassificationBadge } from "@/shared/ui/classification-badge"
import { CHANNEL_META } from "@/shared/domain/channels"
import { formatCurrency, formatRelativeNow } from "@/shared/lib/format"

import { STAGE_ACCENT_CLASSES } from "../_lib/accents"
import type { UiCard } from "../_lib/board-adapter"
import { AutomationIndicator } from "./automation-indicator"

interface DragHandleProps {
  ref: (element: HTMLElement | null) => void
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
}

interface LeadCardViewProps {
  card: UiCard
  /** Chave do acento da etapa-mãe (para a borda lateral colorida). */
  accentKey: string
  /** Render flutuante no DragOverlay → sombra + leve rotação. */
  overlay?: boolean
  /** Liga o handle de arraste ao dnd-kit (injetado pelo wrapper sortable). */
  dragHandle?: DragHandleProps
  /** Clique no corpo do card (abre edição). */
  onClick?: () => void
}

/** Card presentacional puro — reutilizado no board e no DragOverlay. */
export function LeadCardView({
  card,
  accentKey,
  overlay = false,
  dragHandle,
  onClick,
}: LeadCardViewProps) {
  const accent = STAGE_ACCENT_CLASSES[accentKey] ?? STAGE_ACCENT_CLASSES["chart-1"]!
  const channel = CHANNEL_META[card.channel]

  return (
    <div
      className={cn(
        "group/lead relative rounded-lg border border-border bg-card text-card-foreground",
        "border-l-2 transition-shadow",
        accent.border,
        overlay
          ? "rotate-1 shadow-xl"
          : "shadow-xs hover:shadow-sm focus-within:ring-2 focus-within:ring-ring/50",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="flex flex-col gap-2 p-2.5">
        {/* Cabeçalho: canal + contato + valor + handle */}
        <div className="flex items-start gap-2">
          <span
            className={cn(
              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
              channel.soft
            )}
          >
            <ChannelIcon channel={card.channel} className="size-3.5" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">
              {card.contactName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {card.subtitle}
            </p>
          </div>

          <button
            type="button"
            ref={dragHandle?.ref}
            aria-label={`Arrastar card de ${card.contactName}`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "-mr-1 -mt-0.5 flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/60",
              "opacity-0 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none group-hover/lead:opacity-100 active:cursor-grabbing",
              overlay && "opacity-100"
            )}
            {...dragHandle?.attributes}
            {...dragHandle?.listeners}
          >
            <GripVerticalIcon className="size-4" />
          </button>
        </div>

        {/* Valor (omitido em funis sem valor monetário, ex.: atendimento) */}
        {card.valueCents > 0 ? (
          <p className={cn("text-sm font-semibold tabular-nums", accent.text)}>
            {formatCurrency(card.valueCents)}
          </p>
        ) : null}

        {/* Classificação + tags */}
        {card.intent || card.tags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            {card.intent ? <ClassificationBadge intent={card.intent} /> : null}
            {card.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="h-5 rounded-md px-1.5 text-[11px] font-normal text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        {/* Sugestão de IA */}
        {card.aiSuggestion ? (
          <div className="border-ai-border bg-ai/5 flex items-start gap-1.5 rounded-md border px-2 py-1.5">
            <AiTag className="shrink-0 border-0 bg-transparent px-0 py-0">
              IA
            </AiTag>
            <span className="text-ai/90 min-w-0 flex-1 text-[11px] leading-snug">
              {card.aiSuggestion}
            </span>
          </div>
        ) : null}

        {/* Rodapé: automação + tempo na etapa + responsável */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {card.automation ? (
              <AutomationIndicator
                state={card.automation}
                detail={card.automationDetail}
                className="min-w-0"
              />
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">
              {formatRelativeNow(card.enteredAt)}
            </span>
            {card.ownerName ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar size="sm">
                    <AvatarFallback className="text-[10px] font-medium">
                      {card.ownerInitials}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>{card.ownerName}</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Wrapper sortable — liga o card ao dnd-kit (PointerSensor + KeyboardSensor). */
export function SortableLeadCard({
  card,
  accentKey,
  onClick,
}: {
  card: UiCard
  accentKey: string
  onClick?: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: "card", card } })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn(isDragging && "opacity-40")}
    >
      <LeadCardView
        card={card}
        accentKey={accentKey}
        dragHandle={{ ref: setActivatorNodeRef, attributes, listeners }}
        onClick={onClick}
      />
    </div>
  )
}
