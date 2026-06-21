"use client"

import { memo } from "react"

import { Handle, type NodeProps, Position } from "@xyflow/react"

import { cn } from "@workspace/ui/lib/utils"

import { AiTag } from "@/shared/ui/ai-tag"
import { ChannelIcon } from "@/shared/ui/channel-icon"

import { templateIcon } from "../_data/icons"
import { KIND_LABEL, type FlowNode, type NodeKind } from "../_data/types"

/**
 * Nós custom do React Flow. Todos leem TOKENS: superfície card/border/foreground;
 * selecionado = ring-ring + border-primary; o nó de IA ganha o accent --ai
 * (border-ai-border + bg-ai/10 + AiTag). Família distinta por tom + ícone, nunca
 * por cor crua. Cada componente é `memo` e referenciado pelo mapa `nodeTypes`
 * em escopo de módulo (identidade estável).
 */

/** Realce de topo (faixa fina) por família — token tonal, não hex. */
const KIND_ACCENT: Record<NodeKind, string> = {
  trigger: "bg-info",
  ai: "bg-ai",
  condition: "bg-warning",
  action: "bg-success",
}

/** Cor do rótulo de família no cabeçalho do nó. */
const KIND_LABEL_TONE: Record<NodeKind, string> = {
  trigger: "text-info",
  ai: "text-ai",
  condition: "text-warning-foreground",
  action: "text-success",
}

const handleClass =
  "!size-2.5 !rounded-full !border-2 !border-card !bg-muted-foreground"

interface NodeShellProps {
  data: FlowNode["data"]
  selected: boolean
  /** Renderiza handles de saída ramificados (condição). */
  branching?: boolean
  /** Oculta o handle de entrada (gatilhos não têm entrada). */
  noTarget?: boolean
}

function NodeShell({ data, selected, branching, noTarget }: NodeShellProps) {
  const Icon = templateIcon(data.template)
  const isAi = data.kind === "ai"

  return (
    <div
      className={cn(
        "relative w-[220px] rounded-xl border bg-card text-foreground shadow-sm transition-shadow",
        "hover:shadow-md",
        isAi && "border-ai-border bg-ai/10",
        selected
          ? "border-primary ring-2 ring-ring ring-offset-1 ring-offset-background"
          : !isAi && "border-border"
      )}
    >
      <div
        className={cn(
          "h-1 w-full rounded-t-[calc(var(--radius-lg)-1px)]",
          KIND_ACCENT[data.kind]
        )}
      />

      {!noTarget ? (
        <Handle
          type="target"
          position={Position.Left}
          className={handleClass}
        />
      ) : null}

      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
            isAi ? "bg-ai/15 text-ai" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "text-[10px] font-medium tracking-wide uppercase",
                KIND_LABEL_TONE[data.kind]
              )}
            >
              {KIND_LABEL[data.kind]}
            </span>
            {data.channel ? (
              <ChannelIcon channel={data.channel} className="size-3.5" />
            ) : null}
          </div>
          <p className="truncate text-sm leading-tight font-semibold">
            {data.title}
          </p>
          {data.subtitle ? (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {data.subtitle}
            </p>
          ) : null}
          {isAi ? (
            <div className="mt-1.5">
              <AiTag>GraphRAG</AiTag>
            </div>
          ) : null}
        </div>
      </div>

      {branching ? (
        <>
          <BranchHandle id="yes" label="sim" top="34%" tone="text-success" />
          <BranchHandle id="no" label="não" top="72%" tone="text-destructive" />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className={handleClass}
        />
      )}
    </div>
  )
}

function BranchHandle({
  id,
  label,
  top,
  tone,
}: {
  id: string
  label: string
  top: string
  tone: string
}) {
  return (
    <>
      <span
        className={cn(
          "bg-card/90 pointer-events-none absolute right-3.5 -translate-y-1/2 rounded px-1 text-[10px] font-medium",
          tone
        )}
        style={{ top }}
      >
        {label}
      </span>
      <Handle
        type="source"
        position={Position.Right}
        id={id}
        className={handleClass}
        style={{ top }}
      />
    </>
  )
}

function TriggerNodeImpl({ data, selected }: NodeProps<FlowNode>) {
  return <NodeShell data={data} selected={!!selected} noTarget />
}

function AINodeImpl({ data, selected }: NodeProps<FlowNode>) {
  return <NodeShell data={data} selected={!!selected} />
}

function ConditionNodeImpl({ data, selected }: NodeProps<FlowNode>) {
  return <NodeShell data={data} selected={!!selected} branching />
}

function ActionNodeImpl({ data, selected }: NodeProps<FlowNode>) {
  return <NodeShell data={data} selected={!!selected} />
}

export const TriggerNode = memo(TriggerNodeImpl)
export const AINode = memo(AINodeImpl)
export const ConditionNode = memo(ConditionNodeImpl)
export const ActionNode = memo(ActionNodeImpl)
