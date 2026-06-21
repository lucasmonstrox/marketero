"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  ArrowDownToLineIcon,
  BotIcon,
  LockIcon,
  PlusIcon,
  Settings2Icon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { formatCurrency } from "@/shared/lib/format"

import {
  accentKey,
  type Stage,
  STAGE_ACCENT_CLASSES,
} from "../_data/pipelines"
import { SortableLeadCard } from "./lead-card"

interface KanbanColumnProps {
  stage: Stage
  onOpenAutomations: (stage: Stage) => void
  onAddCard: (stageId: string) => void
}

export function KanbanColumn({
  stage,
  onOpenAutomations,
  onAddCard,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: "column", stageId: stage.id },
  })

  const key = accentKey(stage.accent)
  const accent = STAGE_ACCENT_CLASSES[key] ?? STAGE_ACCENT_CLASSES["chart-1"]!
  const absorbing = stage.type === "won" || stage.type === "lost"

  const total = stage.cards.reduce((sum, c) => sum + c.valueCents, 0)
  const activeTriggers = stage.triggers.filter((t) => t.enabled).length
  const activeRobots = stage.robots.filter((r) => r.enabled).length
  const overWip = stage.wipLimit > 0 && stage.cards.length > stage.wipLimit

  return (
    <section
      className="flex h-full w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/40"
      aria-label={`Etapa ${stage.name}`}
    >
      {/* Faixa de cor da etapa (acento por config do funil) */}
      <div className={cn("h-1 rounded-t-xl", accent.bar)} />

      {/* Cabeçalho */}
      <header className={cn("flex flex-col gap-2 rounded-t-none p-3", accent.soft)}>
        <div className="flex items-center gap-2">
          <span className={cn("size-2.5 shrink-0 rounded-full", accent.dot)} />
          <h2 className="flex-1 truncate text-sm font-semibold">
            {stage.name}
          </h2>

          {absorbing ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground inline-flex items-center">
                  <LockIcon className="size-3.5" aria-label="Etapa absorvente" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Etapa absorvente — cards aqui são finais
              </TooltipContent>
            </Tooltip>
          ) : null}

          <Badge
            variant="secondary"
            className="h-5 min-w-5 justify-center px-1.5 tabular-nums"
          >
            {stage.cards.length}
          </Badge>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onOpenAutomations(stage)}
                aria-label={`Automações da etapa ${stage.name}`}
              >
                <Settings2Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Automações da etapa</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center justify-between gap-2">
          {total > 0 ? (
            <span className={cn("text-sm font-semibold tabular-nums", accent.text)}>
              {formatCurrency(total)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Sem valor</span>
          )}

          {stage.wipLimit > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    "tabular-nums",
                    overWip
                      ? "border-warning/40 bg-warning/15 text-warning-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  WIP {stage.cards.length}/{stage.wipLimit}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {overWip
                  ? "Acima do limite de trabalho em andamento"
                  : "Limite de trabalho em andamento (WIP)"}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        {/* Resumo de automações da etapa */}
        <button
          type="button"
          onClick={() => onOpenAutomations(stage)}
          className="flex items-center gap-2 rounded-md text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="inline-flex items-center gap-1">
            <ArrowDownToLineIcon className="text-info size-3" aria-hidden />
            {activeTriggers} {activeTriggers === 1 ? "trigger" : "triggers"}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <BotIcon className="size-3" aria-hidden />
            {activeRobots} {activeRobots === 1 ? "robô" : "robôs"}
          </span>
        </button>
      </header>

      {/* Corpo rolável — droppable */}
      <ScrollArea className="min-h-0 flex-1">
        <div
          ref={setNodeRef}
          className={cn(
            "flex min-h-24 flex-col gap-2 p-2 transition-colors",
            isOver && cn("rounded-lg", accent.soft)
          )}
        >
          <SortableContext
            items={stage.cards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {stage.cards.map((card) => (
              <SortableLeadCard key={card.id} card={card} accentKey={key} />
            ))}
          </SortableContext>

          {stage.cards.length === 0 ? (
            <p
              className={cn(
                "flex flex-1 items-center justify-center rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground",
                isOver && accent.border
              )}
            >
              Solte um card aqui
            </p>
          ) : null}
        </div>
      </ScrollArea>

      {/* Rodapé — novo card */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => onAddCard(stage.id)}
        >
          <PlusIcon className="size-3.5" />
          Novo card
        </Button>
      </div>
    </section>
  )
}
