"use client"

import {
  AlertTriangleIcon,
  CpuIcon,
  FileTextIcon,
  MessagesSquareIcon,
  PlayIcon,
  TimerIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { AiTag } from "@/shared/ui/ai-tag"
import { AGENT_MODELS } from "@/shared/domain/taxonomy"
import { formatNumber, formatPercent } from "@/shared/lib/format"

import { type Agent, ESCALATION_TRIGGER_LABEL } from "../_data/agents"
import { countCampaignsUsingAgent } from "../_data/campaigns"
import { getForm } from "../_data/forms"
import { AgentPreviewChat } from "./agent-preview-chat"

/**
 * Card de um Agente (o "motor"): modelo, persona, Form padrão, política de
 * escalonamento resumida e métricas. O botão "Testar agente" abre o
 * AgentPreviewChat — a vitrine do agente conduzindo o Form via FSM.
 */
export function AgentCard({ agent }: { agent: Agent }) {
  const model = AGENT_MODELS.find((m) => m.id === agent.modelId)
  const defaultForm = getForm(agent.defaultFormId)
  const campaignsCount = countCampaignsUsingAgent(agent.id)
  const policy = agent.escalationPolicy

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5">
            {agent.name}
          </CardTitle>
          <AiTag>Agente</AiTag>
        </div>
        <CardDescription className="flex flex-wrap items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="secondary" className="gap-1">
                <CpuIcon className="size-3" aria-hidden="true" />
                {model?.label ?? agent.modelId}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{model?.hint ?? "Modelo da IA"}</TooltipContent>
          </Tooltip>
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <span aria-hidden="true">·</span> {campaignsCount} campanha
            {campaignsCount === 1 ? "" : "s"}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="text-muted-foreground line-clamp-3 text-sm">
          <span className="text-foreground/70 font-medium">Persona: </span>
          {agent.systemPrompt}
        </p>

        <div className="bg-muted/40 flex items-center gap-2 rounded-lg px-2.5 py-2">
          <FileTextIcon
            className="text-muted-foreground size-3.5 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-[11px]">Form padrão</p>
            <p className="truncate text-sm font-medium">
              {defaultForm?.name ?? "—"}
            </p>
          </div>
        </div>

        {/* Política de escalonamento resumida */}
        <div className="space-y-1.5">
          <p className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase">
            <AlertTriangleIcon className="size-3" aria-hidden="true" />
            Escalonamento
          </p>
          <div className="flex flex-wrap gap-1 text-xs">
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="gap-1 font-normal">
                  <MessagesSquareIcon className="size-3" aria-hidden="true" />
                  {policy.maxDigressions} digressões
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Sai de roteiro {policy.maxDigressions}x sem progresso → escala
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="gap-1 font-normal">
                  <TimerIcon className="size-3" aria-hidden="true" />
                  abandona em {policy.abandonAfter}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Sem resposta nesse prazo → grava lead parcial
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex flex-wrap gap-1">
            {policy.immediateEscalation.map((trigger) => (
              <Badge
                key={trigger}
                variant="outline"
                className="border-warning/40 bg-warning/10 text-warning-foreground gap-1 font-normal"
              >
                {ESCALATION_TRIGGER_LABEL[trigger] ?? trigger}
              </Badge>
            ))}
          </div>
        </div>

        {/* Métricas */}
        <div className="mt-auto grid grid-cols-3 gap-2 border-t pt-3">
          <Metric label="Conversas" value={formatNumber(agent.metrics.conversations)} />
          <Metric
            label="Conclusão"
            value={formatPercent(agent.metrics.completionRate)}
            tone="success"
          />
          <Metric
            label="Escalonam."
            value={formatPercent(agent.metrics.escalationRate)}
            tone="warning"
          />
        </div>
      </CardContent>

      <CardFooter>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full" size="sm">
              <PlayIcon aria-hidden="true" />
              Testar agente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <AgentPreviewChat agent={agent} />
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "success" | "warning"
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-foreground"
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  )
}
