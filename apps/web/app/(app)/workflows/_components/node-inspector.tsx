"use client"

import { MousePointerClickIcon, Trash2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"
import { Slider } from "@workspace/ui/components/slider"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { AiTag } from "@/shared/ui/ai-tag"
import { ChannelIcon } from "@/shared/ui/channel-icon"
import { MVP_CHANNELS, CHANNEL_META } from "@/shared/domain/channels"
import {
  AGENT_MODELS,
  INTENT_META,
  INTENTS,
  TONE_BADGE,
} from "@/shared/domain/taxonomy"

import { templateIcon } from "../_data/icons"
import { KIND_LABEL, type BaseNodeData, type FlowNode } from "../_data/types"

interface NodeInspectorProps {
  node: FlowNode | null
  /** Atualiza campos do nó selecionado (live no canvas). */
  onPatch: (patch: Partial<BaseNodeData>) => void
  onDelete: () => void
}

export function NodeInspector({ node, onPatch, onDelete }: NodeInspectorProps) {
  return (
    <aside className="bg-card flex w-72 shrink-0 flex-col border-l">
      <div className="flex h-10 shrink-0 items-center gap-2 px-3">
        <h2 className="text-xs font-semibold tracking-wide uppercase">
          Propriedades
        </h2>
        {node ? (
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-destructive ml-auto"
            onClick={onDelete}
            aria-label="Remover bloco selecionado"
          >
            <Trash2Icon />
          </Button>
        ) : null}
      </div>
      <Separator />

      {node ? (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 p-3">
            <NodeHeader data={node.data} />
            <Separator />
            <Field label="Título" htmlFor="insp-title">
              <Input
                id="insp-title"
                value={node.data.title}
                onChange={(e) => onPatch({ title: e.target.value })}
              />
            </Field>
            <Field label="Descrição" htmlFor="insp-subtitle">
              <Input
                id="insp-subtitle"
                value={node.data.subtitle ?? ""}
                placeholder="Resumo curto do bloco"
                onChange={(e) => onPatch({ subtitle: e.target.value })}
              />
            </Field>

            <Separator />
            <KindFields node={node} onPatch={onPatch} />
          </div>
        </ScrollArea>
      ) : (
        <EmptyHint />
      )}
    </aside>
  )
}

function NodeHeader({ data }: { data: BaseNodeData }) {
  const Icon = templateIcon(data.template)
  const isAi = data.kind === "ai"
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-lg",
          isAi ? "bg-ai/15 text-ai" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-4.5" aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            {KIND_LABEL[data.kind]}
          </span>
          {isAi ? <AiTag icon={false} /> : null}
        </div>
        <p className="truncate text-sm font-semibold">{data.title}</p>
      </div>
    </div>
  )
}

function EmptyHint() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-xl">
        <MousePointerClickIcon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Nenhum bloco selecionado</p>
        <p className="text-muted-foreground text-xs">
          Selecione um bloco no canvas para editar gatilho, IA, condição ou
          ação.
        </p>
      </div>
    </div>
  )
}

/* --------------------------- Campos por família --------------------------- */

function KindFields({
  node,
  onPatch,
}: {
  node: FlowNode
  onPatch: (patch: Partial<BaseNodeData>) => void
}) {
  switch (node.data.kind) {
    case "trigger":
      return <TriggerFields node={node} onPatch={onPatch} />
    case "ai":
      return <AiFields />
    case "condition":
      return <ConditionFields />
    case "action":
      return <ActionFields node={node} />
  }
}

function TriggerFields({
  node,
  onPatch,
}: {
  node: FlowNode
  onPatch: (patch: Partial<BaseNodeData>) => void
}) {
  return (
    <div className="space-y-4">
      <Field label="Canal de origem" htmlFor="insp-channel">
        <Select
          value={node.data.channel ?? "whatsapp"}
          onValueChange={(value) =>
            onPatch({ channel: value as BaseNodeData["channel"] })
          }
        >
          <SelectTrigger id="insp-channel" className="w-full">
            <SelectValue placeholder="Selecionar canal" />
          </SelectTrigger>
          <SelectContent>
            {MVP_CHANNELS.map((channel) => (
              <SelectItem key={channel} value={channel}>
                <ChannelIcon channel={channel} className="size-3.5" />
                {CHANNEL_META[channel].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Condição de entrada" htmlFor="insp-trigger-cond">
        <Select defaultValue="always">
          <SelectTrigger id="insp-trigger-cond" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="always">Sempre que ocorrer</SelectItem>
            <SelectItem value="business_hours">Só em horário comercial</SelectItem>
            <SelectItem value="first_contact">Apenas primeiro contato</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <ToggleRow
        id="insp-dedupe"
        label="Deduplicar por evento"
        hint="Ignora eventos repetidos (dedupe_key)"
        defaultChecked
      />
    </div>
  )
}

function AiFields() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          Bloco de IA
        </span>
        <AiTag />
      </div>

      <Field label="Modelo" htmlFor="insp-model">
        <Select defaultValue={AGENT_MODELS[1]?.id}>
          <SelectTrigger id="insp-model" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AGENT_MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Instrução (prompt)" htmlFor="insp-prompt">
        <Textarea
          id="insp-prompt"
          rows={4}
          className="text-xs"
          defaultValue={
            "Classifique a intenção da mensagem na taxonomia fechada do funil " +
            "(dúvida, intenção de compra, reclamação, suporte, elogio, spam) " +
            "usando o GraphRAG do tenant."
          }
        />
      </Field>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="insp-temp">Temperatura</Label>
          <span className="text-muted-foreground text-xs tabular-nums">0,2</span>
        </div>
        <Slider
          id="insp-temp"
          defaultValue={[20]}
          max={100}
          step={5}
          aria-label="Temperatura do modelo"
        />
      </div>

      <ToggleRow
        id="insp-grounding"
        label="Citar fontes do grafo"
        hint="Anexa as entidades usadas na resposta"
        defaultChecked
      />
    </div>
  )
}

function ConditionFields() {
  return (
    <div className="space-y-4">
      <Field label="Campo" htmlFor="insp-field">
        <Select defaultValue="intent">
          <SelectTrigger id="insp-field" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="intent">Intenção classificada</SelectItem>
            <SelectItem value="confidence">Confiança</SelectItem>
            <SelectItem value="channel">Canal</SelectItem>
            <SelectItem value="stage">Etapa do funil</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-[1fr_1.4fr] gap-2">
        <Field label="Operador" htmlFor="insp-op">
          <Select defaultValue="eq">
            <SelectTrigger id="insp-op" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eq">igual a</SelectItem>
              <SelectItem value="neq">diferente de</SelectItem>
              <SelectItem value="gte">≥</SelectItem>
              <SelectItem value="lt">{"<"}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Valor" htmlFor="insp-value">
          <Select defaultValue="intencao_de_compra">
            <SelectTrigger id="insp-value" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTENTS.map((intent) => (
                <SelectItem key={intent} value={intent}>
                  {INTENT_META[intent].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="insp-conf">Confiança mínima</Label>
          <span
            className={cn(
              "rounded-md border px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
              TONE_BADGE.success
            )}
          >
            ≥ 0,80
          </span>
        </div>
        <Slider
          id="insp-conf"
          defaultValue={[80]}
          max={100}
          step={5}
          aria-label="Confiança mínima da condição"
        />
      </div>

      <ToggleRow
        id="insp-backward"
        label="Permitir retrocesso"
        hint="allow_backward — mover card para etapa anterior"
      />
    </div>
  )
}

function ActionFields({ node }: { node: FlowNode }) {
  const template = node.data.template

  if (template === "action.whatsapp") {
    return (
      <div className="space-y-4">
        <Field label="Template aprovado" htmlFor="insp-template">
          <Select defaultValue="boas_vindas">
            <SelectTrigger id="insp-template" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="boas_vindas">Boas-vindas — lead</SelectItem>
              <SelectItem value="catalogo">Enviar catálogo</SelectItem>
              <SelectItem value="proposta">Follow-up de proposta</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Janela de envio" htmlFor="insp-window">
          <Input id="insp-window" defaultValue="Imediato (até 24h da Meta)" />
        </Field>
        <ToggleRow
          id="insp-firstreply"
          label="Só se ainda não respondido"
          hint="Condição not first_reply_sent (anti-dupla-resposta)"
          defaultChecked
        />
      </div>
    )
  }

  if (template === "action.timer") {
    return (
      <div className="space-y-4">
        <Field label="Tipo de timer" htmlFor="insp-timer-kind">
          <Select defaultValue="on_stay">
            <SelectTrigger id="insp-timer-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="on_stay">Parado na etapa (on-stay)</SelectItem>
              <SelectItem value="no_reply">Sem resposta (SLA)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-[1fr_1fr] gap-2">
          <Field label="Duração" htmlFor="insp-timer-dur">
            <Input id="insp-timer-dur" type="number" defaultValue={15} />
          </Field>
          <Field label="Unidade" htmlFor="insp-timer-unit">
            <Select defaultValue="min">
              <SelectTrigger id="insp-timer-unit" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="min">minutos</SelectItem>
                <SelectItem value="hour">horas</SelectItem>
                <SelectItem value="day">dias</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <p className="text-muted-foreground text-xs">
          Ao disparar, escala o card e gera o trigger de movimentação.
        </p>
      </div>
    )
  }

  if (template === "action.capi") {
    return (
      <div className="space-y-4">
        <Field label="Evento (Events Manager)" htmlFor="insp-capi-event">
          <Select defaultValue="qualified_lead">
            <SelectTrigger id="insp-capi-event" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="qualified_lead">qualified_lead (custom)</SelectItem>
              <SelectItem value="Purchase">Purchase (standard)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="action_source" htmlFor="insp-capi-source">
          <Select defaultValue="system_generated">
            <SelectTrigger id="insp-capi-source" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system_generated">system_generated</SelectItem>
              <SelectItem value="website">website</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <ToggleRow
          id="insp-capi-idem"
          label="Garantir idempotência"
          hint="Grava conversion_synced_at (evita duplicidade)"
          defaultChecked
        />
      </div>
    )
  }

  if (template === "action.tag") {
    return (
      <div className="space-y-4">
        <Field label="Etiqueta" htmlFor="insp-tag">
          <Input id="insp-tag" defaultValue="lead-frio" />
        </Field>
        <Field label="Cor da etiqueta" htmlFor="insp-tag-tone">
          <Select defaultValue="muted">
            <SelectTrigger id="insp-tag-tone" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="muted">Neutra</SelectItem>
              <SelectItem value="warning">Atenção</SelectItem>
              <SelectItem value="success">Positiva</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    )
  }

  // Ação genérica (mover, atribuir, esperar, webhook etc.)
  return (
    <div className="space-y-4">
      <Field label="Parâmetro" htmlFor="insp-action-param">
        <Input id="insp-action-param" placeholder="Valor do parâmetro" />
      </Field>
      <ToggleRow
        id="insp-action-async"
        label="Executar de forma assíncrona"
        hint="Não bloqueia os próximos blocos"
        defaultChecked
      />
    </div>
  )
}

/* ------------------------------- Primitivos ------------------------------- */

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function ToggleRow({
  id,
  label,
  hint,
  defaultChecked,
}: {
  id: string
  label: string
  hint?: string
  defaultChecked?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="leading-tight">
          {label}
        </Label>
        {hint ? (
          <p className="text-muted-foreground text-[11px] leading-tight">
            {hint}
          </p>
        ) : null}
      </div>
      <Switch id={id} defaultChecked={defaultChecked} className="mt-0.5" />
    </div>
  )
}
