"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  ImageIcon,
  InfoIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Slider } from "@workspace/ui/components/slider"
import { cn } from "@workspace/ui/lib/utils"

import {
  BRAND_FONT_OPTIONS,
  BRAND_PRESETS,
  CUSTOM_DOMAIN,
  DNS_STATUS_META,
  WHITE_LABEL_DEFAULTS,
} from "../_data/settings"
import { StatusBadge } from "./status-badge"

/**
 * White-label (design-system §6 — Eixo B). Controla a MARCA dos forms/landing
 * PÚBLICOS hospedados do tenant (cor, raio, fonte, logo, domínio próprio) — algo
 * distinto do tema claro/escuro do produto (Eixo A). As swatches de cor são
 * VALORES de dados do tenant: aplicadas via `style` inline, nunca como classe
 * Tailwind do chrome. Um chip de preview ao vivo aplica a escolha.
 */
export function WhiteLabelSettings() {
  const [presetId, setPresetId] = React.useState(WHITE_LABEL_DEFAULTS.presetId)
  const [customColor, setCustomColor] = React.useState("")
  const [radius, setRadius] = React.useState(WHITE_LABEL_DEFAULTS.radius)
  const [font, setFont] = React.useState(WHITE_LABEL_DEFAULTS.fontValue)
  const [domain, setDomain] = React.useState(CUSTOM_DOMAIN.host)
  const [copied, setCopied] = React.useState(false)

  const preset = BRAND_PRESETS.find((p) => p.id === presetId)
  const brandColor = isHex(customColor) ? customColor : preset?.hex ?? "#4F46E5"
  const fontLabel =
    BRAND_FONT_OPTIONS.find((f) => f.value === font)?.label ?? "Inter"
  const dns = DNS_STATUS_META[CUSTOM_DOMAIN.status]

  function copyCname() {
    navigator.clipboard?.writeText(CUSTOM_DOMAIN.cnameTarget)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="space-y-5">
      <div className="bg-accent/40 text-muted-foreground flex items-start gap-2 rounded-lg border px-3 py-2 text-xs">
        <InfoIcon className="text-foreground/70 mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>
          Estes ajustes controlam a marca dos{" "}
          <span className="text-foreground font-medium">
            formulários e landing pages públicos
          </span>{" "}
          que você hospeda — não o tema claro/escuro do produto, que cada operador
          escolhe individualmente.
        </p>
      </div>

      {/* Cor da marca */}
      <div className="space-y-2.5">
        <Label asChild>
          <span>Cor da marca</span>
        </Label>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Preset de cor da marca"
        >
          {BRAND_PRESETS.map((p) => {
            const selected = !customColor && p.id === presetId
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setPresetId(p.id)
                  setCustomColor("")
                }}
                className={cn(
                  "focus-visible:ring-ring/50 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3",
                  selected
                    ? "border-foreground/40 bg-muted"
                    : "border-border hover:bg-muted/60"
                )}
              >
                <span
                  className="ring-foreground/15 size-4 rounded-full ring-1"
                  style={{ backgroundColor: p.hex }}
                  aria-hidden
                />
                {p.label}
                {selected ? (
                  <CheckIcon className="size-3.5" aria-hidden />
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Label htmlFor="brand-custom" className="text-xs font-normal">
            Cor personalizada
          </Label>
          <div className="flex items-center gap-2">
            <span
              className="size-7 shrink-0 rounded-md border"
              style={{ backgroundColor: brandColor }}
              aria-hidden
            />
            <Input
              id="brand-custom"
              value={customColor}
              placeholder="#C2643B"
              spellCheck={false}
              className="w-32 font-mono text-xs"
              onChange={(e) => setCustomColor(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Raio + fonte */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="brand-radius">Raio dos cantos</Label>
            <span className="text-muted-foreground text-xs tabular-nums">
              {radius}px
            </span>
          </div>
          <Slider
            id="brand-radius"
            min={0}
            max={24}
            step={1}
            value={[radius]}
            onValueChange={(v) => setRadius(v[0] ?? 0)}
            aria-label="Raio dos cantos da marca"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand-font">Fonte</Label>
          <Select value={font} onValueChange={setFont}>
            <SelectTrigger id="brand-font" className="w-full">
              <SelectValue placeholder="Selecione a fonte" />
            </SelectTrigger>
            <SelectContent>
              {BRAND_FONT_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Logo + preview ao vivo */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label asChild>
            <span>Logo</span>
          </Label>
          <div className="flex items-center gap-3">
            <div
              className="bg-muted text-muted-foreground flex size-14 shrink-0 items-center justify-center rounded-lg border border-dashed"
              aria-hidden
            >
              <ImageIcon className="size-5" />
            </div>
            <div className="space-y-1.5">
              <Button variant="outline" size="sm">
                Enviar logo
              </Button>
              <p className="text-muted-foreground text-[11px]">
                PNG ou SVG, fundo transparente, até 1&nbsp;MB.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label asChild>
            <span>Pré-visualização</span>
          </Label>
          <BrandPreview
            color={brandColor}
            radius={radius}
            fontLabel={fontLabel}
          />
        </div>
      </div>

      {/* Domínio próprio */}
      <div className="space-y-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="brand-domain">Domínio próprio dos formulários</Label>
            <Input
              id="brand-domain"
              value={domain}
              spellCheck={false}
              className="font-mono text-xs"
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
          <StatusBadge tone={dns.tone} label={dns.label} />
        </div>
        <div className="bg-muted/40 flex flex-col gap-1.5 rounded-lg border p-3 text-xs">
          <p className="text-muted-foreground">
            Aponte um registro CNAME do seu domínio para:
          </p>
          <div className="flex items-center gap-2">
            <code className="bg-background rounded-md border px-2 py-1 font-mono">
              {CUSTOM_DOMAIN.cnameTarget}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={copyCname}
              aria-label="Copiar destino do CNAME"
            >
              {copied ? (
                <CheckIcon className="text-success" aria-hidden />
              ) : (
                <CopyIcon aria-hidden />
              )}
            </Button>
          </div>
        </div>
      </div>

      <Button variant="outline" size="sm" asChild>
        <Link href="/builder">
          Abrir editor de formulários
          <ArrowRightIcon aria-hidden />
        </Link>
      </Button>
    </div>
  )
}

/** Cartão de preview que aplica cor/raio/fonte escolhidos via `style` inline. */
function BrandPreview({
  color,
  radius,
  fontLabel,
}: {
  color: string
  radius: number
  fontLabel: string
}) {
  return (
    <div
      className="bg-card flex items-center justify-between gap-3 border p-3"
      style={{ borderRadius: radius + 4 }}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">Quero um orçamento</p>
        <p className="text-muted-foreground truncate text-xs">
          Fonte {fontLabel} · prévia da marca
        </p>
      </div>
      <span
        className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: color, borderRadius: radius }}
      >
        Enviar
      </span>
    </div>
  )
}

function isHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())
}
