"use client"

import { CheckIcon, ShieldCheckIcon } from "lucide-react"

import { Label } from "@workspace/ui/components/label"
import { Slider } from "@workspace/ui/components/slider"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"

import { AiTag } from "@/shared/ui/ai-tag"

import type { SlotKey, SlotPatch } from "../_data/preview-conversation"

/**
 * Inspetor de slots do preview (agentes.md §7.8): os campos do Form preenchendo
 * AO VIVO conforme o Agente extrai os valores, com check ao capturar. Inclui o
 * gate de consentimento (LGPD) — o switch precisa estar ligado para a FSM
 * concluir. Reflete o estado da FSM, nunca é a fonte da verdade da conversa.
 */

/** Ordem e rótulo dos slots (casa com form-sob-medida em forms.ts). */
const SLOT_FIELDS: { key: SlotKey; label: string; type: string }[] = [
  { key: "nome", label: "Nome", type: "TEXT" },
  { key: "email", label: "E-mail", type: "EMAIL" },
  { key: "telefone", label: "Telefone", type: "PHONE" },
  { key: "ambiente", label: "Interesse / ambiente", type: "SELECT" },
  { key: "orcamento", label: "Orçamento", type: "SLIDER" },
]

/** Teto do slider de orçamento em centavos (R$ 60.000) — para posicionar o valor. */
const ORCAMENTO_MAX_CENTS = 6_000_000

interface SlotInspectorProps {
  slots: Record<SlotKey, SlotPatch | undefined>
  consentRequired: boolean
  consentAccepted: boolean
  onConsentChange: (accepted: boolean) => void
  /** Trava o gate até a FSM chegar em `consent`. */
  consentEnabled: boolean
}

export function SlotInspector({
  slots,
  consentRequired,
  consentAccepted,
  onConsentChange,
  consentEnabled,
}: SlotInspectorProps) {
  const filledCount = SLOT_FIELDS.filter((f) => slots[f.key]).length
  const orcamento = slots.orcamento
  const orcamentoCents =
    typeof orcamento?.value === "number" ? orcamento.value : 0

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium">Slots do Form</h3>
          <AiTag>Preenchendo</AiTag>
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          {filledCount}/{SLOT_FIELDS.length}
        </span>
      </div>

      <ul className="space-y-1.5">
        {SLOT_FIELDS.map((field) => {
          const slot = slots[field.key]
          const filled = Boolean(slot)
          return (
            <li
              key={field.key}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors",
                filled
                  ? "border-success/30 bg-success/5"
                  : "border-dashed bg-muted/30"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full",
                  filled
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                )}
                aria-hidden="true"
              >
                {filled ? (
                  <CheckIcon className="size-3" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{field.label}</span>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {field.type}
                  </span>
                </div>
                <p
                  className={cn(
                    "truncate text-sm",
                    filled ? "text-foreground" : "text-muted-foreground italic"
                  )}
                >
                  {filled ? slot?.display : "aguardando…"}
                  <span className="sr-only">
                    {filled ? " — capturado" : " — ainda não capturado"}
                  </span>
                </p>
                {field.key === "orcamento" ? (
                  <Slider
                    aria-label="Orçamento capturado"
                    value={[orcamentoCents]}
                    max={ORCAMENTO_MAX_CENTS}
                    step={50_000}
                    disabled
                    className="mt-2"
                  />
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      <div
        className={cn(
          "mt-auto rounded-lg border p-3 transition-colors",
          consentAccepted
            ? "border-success/30 bg-success/5"
            : "border-warning/40 bg-warning/10"
        )}
      >
        <div className="flex items-start gap-2.5">
          <ShieldCheckIcon
            className={cn(
              "mt-0.5 size-4 shrink-0",
              consentAccepted ? "text-success" : "text-warning"
            )}
            aria-hidden="true"
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor="consent-gate"
                className="text-xs font-medium"
              >
                Consentimento (LGPD)
                {consentRequired ? (
                  <span className="text-destructive"> *</span>
                ) : null}
              </Label>
              <Switch
                id="consent-gate"
                checked={consentAccepted}
                onCheckedChange={onConsentChange}
                disabled={!consentEnabled}
                aria-describedby="consent-help"
              />
            </div>
            <p id="consent-help" className="text-muted-foreground text-xs">
              {consentAccepted
                ? "Aceite registrado — a FSM pode concluir e emitir o lead."
                : consentEnabled
                  ? "Gate obrigatório: ative para liberar o estado complete."
                  : "Liberado quando a conversa chegar ao estado consent."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
