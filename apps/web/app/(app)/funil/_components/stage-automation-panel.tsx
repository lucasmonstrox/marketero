"use client"

import {
  ArrowDownToLineIcon,
  BotIcon,
  InfoIcon,
  PlusIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"

import {
  accentKey,
  ROBOT_META,
  type Stage,
  STAGE_ACCENT_CLASSES,
  type StageRobot,
  type StageTrigger,
  TRIGGER_META,
} from "../_data/pipelines"
import { RobotBadge } from "./robot-badge"
import { TriggerBadge } from "./trigger-badge"

interface StageAutomationPanelProps {
  stage: Stage | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggleTrigger: (stageId: string, triggerId: string) => void
  onToggleRobot: (stageId: string, robotId: string) => void
}

/**
 * Painel de automações de uma etapa (Sheet à direita), espelhando o modelo
 * Bitrix24 de funcionalidades/kanban.md em DUAS faixas:
 *  (1) "Mover card para cá quando…" → TRIGGERS (inbound, MOVEM o card)
 *  (2) "Quando o card chega aqui…" → ROBÔS (outbound, AGEM na etapa)
 * Cada item tem Switch on/off (mock). A invariante trigger-move vs robô-age é
 * o conceito central a comunicar.
 */
export function StageAutomationPanel({
  stage,
  open,
  onOpenChange,
  onToggleTrigger,
  onToggleRobot,
}: StageAutomationPanelProps) {
  const accent = stage
    ? STAGE_ACCENT_CLASSES[accentKey(stage.accent)]
    : undefined

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-4 py-3.5">
          <div className="flex items-center gap-2">
            {accent ? (
              <span className={cn("size-2.5 rounded-full", accent.dot)} />
            ) : null}
            <SheetTitle>Automações · {stage?.name}</SheetTitle>
          </div>
          <SheetDescription>
            Triggers movem o card para esta etapa. Robôs agem quando o card
            chega aqui.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-5 p-4">
            {/* Faixa 1 — TRIGGERS */}
            <FaixaTriggers
              triggers={stage?.triggers ?? []}
              absorbing={stage?.type === "won" || stage?.type === "lost"}
              onToggle={(id) => stage && onToggleTrigger(stage.id, id)}
            />

            <Separator />

            {/* Faixa 2 — ROBÔS */}
            <FaixaRobots
              robots={stage?.robots ?? []}
              onToggle={(id) => stage && onToggleRobot(stage.id, id)}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function FaixaTriggers({
  triggers,
  absorbing,
  onToggle,
}: {
  triggers: StageTrigger[]
  absorbing: boolean
  onToggle: (id: string) => void
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <header className="flex items-center gap-2">
        <span className="border-info/30 bg-info/10 text-info flex size-6 items-center justify-center rounded-md border">
          <ArrowDownToLineIcon className="size-3.5" aria-hidden />
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-medium">Mover card para cá quando…</h3>
          <p className="text-xs text-muted-foreground">
            Gatilhos de entrada (inbound)
          </p>
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          {triggers.filter((t) => t.enabled).length}/{triggers.length}
        </Badge>
      </header>

      {absorbing ? (
        <p className="text-muted-foreground flex items-start gap-1.5 rounded-md border border-dashed px-2.5 py-2 text-xs">
          <InfoIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          Etapa absorvente: triggers de canal não tiram um card já finalizado
          daqui.
        </p>
      ) : null}

      {triggers.length === 0 ? (
        <EmptyRow text="Nenhum trigger configurado nesta etapa." />
      ) : (
        triggers.map((t) => (
          <AutomationRow
            key={t.id}
            enabled={t.enabled}
            onToggle={() => onToggle(t.id)}
            badge={<TriggerBadge type={t.type} muted={!t.enabled} />}
            hint={t.detail ?? TRIGGER_META[t.type].hint}
            switchLabel={`Trigger ${TRIGGER_META[t.type].label}`}
          />
        ))
      )}

      <AddRow label="Adicionar trigger" />
    </section>
  )
}

function FaixaRobots({
  robots,
  onToggle,
}: {
  robots: StageRobot[]
  onToggle: (id: string) => void
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <header className="flex items-center gap-2">
        <span className="border-border bg-secondary text-secondary-foreground flex size-6 items-center justify-center rounded-md border">
          <BotIcon className="size-3.5" aria-hidden />
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-medium">Quando o card chega aqui…</h3>
          <p className="text-xs text-muted-foreground">
            Robôs / ações (outbound)
          </p>
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          {robots.filter((r) => r.enabled).length}/{robots.length}
        </Badge>
      </header>

      {robots.length === 0 ? (
        <EmptyRow text="Nenhum robô configurado nesta etapa." />
      ) : (
        robots.map((r) => (
          <AutomationRow
            key={r.id}
            enabled={r.enabled}
            onToggle={() => onToggle(r.id)}
            badge={<RobotBadge type={r.type} muted={!r.enabled} />}
            hint={r.detail ?? ROBOT_META[r.type].hint}
            switchLabel={`Robô ${ROBOT_META[r.type].label}`}
          />
        ))
      )}

      <AddRow label="Adicionar robô" />
    </section>
  )
}

function AutomationRow({
  enabled,
  onToggle,
  badge,
  hint,
  switchLabel,
}: {
  enabled: boolean
  onToggle: () => void
  badge: React.ReactNode
  hint: string
  switchLabel: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-2.5 transition-colors",
        !enabled && "bg-muted/40"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div>{badge}</div>
        <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        aria-label={switchLabel}
      />
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="text-muted-foreground rounded-lg border border-dashed px-2.5 py-3 text-center text-xs">
      {text}
    </p>
  )
}

function AddRow({ label }: { label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground justify-start"
      disabled
    >
      <PlusIcon className="size-3.5" />
      {label}
    </Button>
  )
}
