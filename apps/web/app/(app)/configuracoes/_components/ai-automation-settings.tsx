"use client"

import * as React from "react"
import { MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
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
import { cn } from "@workspace/ui/lib/utils"

import {
  AGENT_MODELS,
  CONFIDENCE_BAND_META,
  type ConfidenceBand,
  TONE_BADGE,
} from "@/shared/domain/taxonomy"

import {
  ABANDON_AFTER_OPTIONS,
  CONFIDENCE_DEFAULTS,
  DEFAULT_AGENT_MODEL,
  ESCALATION_DEFAULTS,
  ESCALATION_TRIGGERS,
} from "../_data/settings"

/**
 * IA & Automação (kanban.md faixas de confiança + agentes.md §10 escalation).
 * Modelo default do Agente, os cortes das faixas de confiança (auto/revisar/
 * ignorar) e os defaults da escalation_policy. As faixas são dois limiares
 * encadeados (revisar ≤ auto) mostrados sobre uma régua de 3 zonas tonais.
 */
export function AiAutomationSettings() {
  const [model, setModel] = React.useState(DEFAULT_AGENT_MODEL)
  const [autoCut, setAutoCut] = React.useState(CONFIDENCE_DEFAULTS.auto)
  const [reviewCut, setReviewCut] = React.useState(CONFIDENCE_DEFAULTS.review)

  const [maxDigressions, setMaxDigressions] = React.useState(
    ESCALATION_DEFAULTS.maxDigressions
  )
  const [maxRetries, setMaxRetries] = React.useState(
    ESCALATION_DEFAULTS.maxValidationRetries
  )
  const [abandonAfter, setAbandonAfter] = React.useState(
    ESCALATION_DEFAULTS.abandonAfter
  )
  const [reengage, setReengage] = React.useState(
    ESCALATION_DEFAULTS.reengageBeforeAbandon
  )
  const [triggers, setTriggers] = React.useState(ESCALATION_DEFAULTS.triggers)

  return (
    <div className="space-y-5">
      {/* Modelo default do Agente */}
      <div className="space-y-1.5">
        <Label htmlFor="agent-model">Modelo padrão do Agente</Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger id="agent-model" className="w-full sm:max-w-sm">
            <SelectValue placeholder="Selecione o modelo" />
          </SelectTrigger>
          <SelectContent>
            {AGENT_MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <span className="flex items-center gap-2">
                  <span className="text-sm">{m.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {m.hint}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Aplicado a novos agentes; cada agente pode sobrescrever.
        </p>
      </div>

      <Separator />

      {/* Faixas de confiança */}
      <ConfidenceBands
        autoCut={autoCut}
        reviewCut={reviewCut}
        onAutoCut={(v) => setAutoCut(Math.max(v, reviewCut + 1))}
        onReviewCut={(v) => setReviewCut(Math.min(v, autoCut - 1))}
      />

      <Separator />

      {/* Escalation policy */}
      <div className="space-y-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-medium">Política de escalonamento</h3>
          <p className="text-muted-foreground text-xs">
            Quando o agente passa a conversa para um humano (defaults por agente).
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stepper
            id="max-digressions"
            label="Máx. de digressões"
            hint="Saídas de roteiro sem progresso"
            value={maxDigressions}
            min={1}
            max={10}
            onChange={setMaxDigressions}
          />
          <Stepper
            id="max-retries"
            label="Máx. de revalidações"
            hint="Re-perguntar o mesmo campo"
            value={maxRetries}
            min={1}
            max={5}
            onChange={setMaxRetries}
          />
          <div className="bg-muted/40 space-y-1.5 rounded-lg border p-3">
            <Label htmlFor="abandon-after" className="text-xs font-medium">
              Abandonar após
            </Label>
            <Select value={abandonAfter} onValueChange={setAbandonAfter}>
              <SelectTrigger id="abandon-after" size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ABANDON_AFTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-[11px]">
              Sem resposta no prazo grava lead parcial.
            </p>
          </div>
        </div>

        <ToggleRow
          id="reengage"
          label="Reengajar antes de abandonar"
          hint="Envia 1 lembrete antes de marcar como abandonado."
          checked={reengage}
          onChange={setReengage}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">Gatilhos imediatos para humano</p>
          <p className="text-muted-foreground text-xs">
            Pulam a retomada e escalam na hora.
          </p>
          <div className="divide-border bg-muted/40 divide-y rounded-lg border">
            {ESCALATION_TRIGGERS.map((trigger) => (
              <ToggleRow
                key={trigger.id}
                id={`trigger-${trigger.id}`}
                label={trigger.label}
                hint={trigger.hint}
                checked={triggers[trigger.id]}
                onChange={(checked) =>
                  setTriggers((prev) => ({ ...prev, [trigger.id]: checked }))
                }
                bare
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* --------------------------- Faixas de confiança ------------------------- */

function ConfidenceBands({
  autoCut,
  reviewCut,
  onAutoCut,
  onReviewCut,
}: {
  autoCut: number
  reviewCut: number
  onAutoCut: (v: number) => void
  onReviewCut: (v: number) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium">Faixas de confiança</h3>
        <p className="text-muted-foreground text-xs">
          Como a IA age conforme a confiança da classificação.
        </p>
      </div>

      {/* Régua de zonas */}
      <div
        className="bg-muted flex h-2 overflow-hidden rounded-full"
        aria-hidden
      >
        <span className="bg-muted-foreground/40 h-full" style={{ width: `${reviewCut}%` }} />
        <span className="bg-warning h-full" style={{ width: `${autoCut - reviewCut}%` }} />
        <span className="bg-success h-full" style={{ width: `${100 - autoCut}%` }} />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <BandPill
          band="ignore"
          range={`< ${reviewCut}%`}
        />
        <BandPill
          band="review"
          range={`${reviewCut}–${autoCut - 1}%`}
        />
        <BandPill band="auto" range={`≥ ${autoCut}%`} />
      </div>

      <div className="grid gap-4 pt-1 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="review-cut" className="text-xs">
              Corte de revisão
            </Label>
            <span className="text-muted-foreground text-xs tabular-nums">
              {reviewCut}%
            </span>
          </div>
          <Slider
            id="review-cut"
            min={5}
            max={95}
            step={1}
            value={[reviewCut]}
            onValueChange={(v) => onReviewCut(v[0] ?? 0)}
            aria-label="Corte mínimo para revisão humana"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-cut" className="text-xs">
              Corte de auto-ação
            </Label>
            <span className="text-muted-foreground text-xs tabular-nums">
              {autoCut}%
            </span>
          </div>
          <Slider
            id="auto-cut"
            min={5}
            max={95}
            step={1}
            value={[autoCut]}
            onValueChange={(v) => onAutoCut(v[0] ?? 0)}
            aria-label="Corte mínimo para auto-ação"
          />
        </div>
      </div>
    </div>
  )
}

function BandPill({ band, range }: { band: ConfidenceBand; range: string }) {
  const meta = CONFIDENCE_BAND_META[band]
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-2.5 py-1.5",
        TONE_BADGE[meta.tone]
      )}
    >
      <span className="text-xs font-medium">{meta.label}</span>
      <span className="text-xs font-semibold tabular-nums">{range}</span>
    </div>
  )
}

/* -------------------------------- Controles ------------------------------ */

function Stepper({
  id,
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="bg-muted/40 space-y-1.5 rounded-lg border p-3">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Diminuir ${label}`}
        >
          <MinusIcon aria-hidden />
        </Button>
        <output
          id={id}
          className="w-8 text-center text-sm font-semibold tabular-nums"
        >
          {value}
        </output>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Aumentar ${label}`}
        >
          <PlusIcon aria-hidden />
        </Button>
      </div>
      <p className="text-muted-foreground text-[11px]">{hint}</p>
    </div>
  )
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
  bare = false,
}: {
  id: string
  label: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
  bare?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 p-3",
        !bare && "bg-muted/40 rounded-lg border"
      )}
    >
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
