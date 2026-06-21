"use client"

import { CheckIcon, ImageIcon, InfoIcon, PaletteIcon } from "lucide-react"

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
  BRAND_PRESETS,
  FONT_OPTIONS,
  TENANT_NAME,
} from "../_data/tenant"
import type { TenantTheme } from "../_data/types"

interface TenantThemePanelProps {
  theme: TenantTheme
  onChange: (theme: TenantTheme) => void
}

export function TenantThemePanel({ theme, onChange }: TenantThemePanelProps) {
  return (
    <div className="flex flex-col gap-5 p-3">
      {/* Nota explicativa: Eixo B */}
      <div className="flex gap-2 rounded-lg border border-ai-border bg-ai/5 p-2.5">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0 text-ai" />
        <p className="text-[11px] leading-snug text-muted-foreground">
          <span className="font-medium text-foreground">White-label (Eixo B).</span>{" "}
          A marca de <span className="font-medium">{TENANT_NAME}</span> é aplicada
          ao conteúdo público por variáveis CSS (
          <code className="text-[10px]">--primary</code>,{" "}
          <code className="text-[10px]">--radius</code>,{" "}
          <code className="text-[10px]">--font-sans</code>). É independente do tema
          claro/escuro do produto.
        </p>
      </div>

      {/* Cor da marca */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <PaletteIcon className="size-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground">Cor da marca</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {BRAND_PRESETS.map((preset) => {
            const active = preset.value === theme.primary
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange({ ...theme, primary: preset.value })}
                aria-pressed={active}
                aria-label={preset.label}
                className={cn(
                  "group flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors",
                  active
                    ? "border-primary bg-accent"
                    : "border-border hover:border-primary/40 hover:bg-accent"
                )}
              >
                <span
                  className="grid size-8 place-items-center rounded-md ring-1 ring-foreground/10"
                  style={{ background: preset.value }}
                >
                  {active ? (
                    <CheckIcon className="size-4 text-white" />
                  ) : null}
                </span>
                <span className="text-[10px] leading-tight text-muted-foreground">
                  {preset.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Cor customizada (valor OKLCH/CSS literal = dado da marca) */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brand-custom" className="text-xs">
            Cor customizada (OKLCH / CSS)
          </Label>
          <div className="flex items-center gap-2">
            <span
              className="size-8 shrink-0 rounded-md border ring-1 ring-foreground/10"
              style={{ background: theme.primary }}
              aria-hidden
            />
            <Input
              id="brand-custom"
              value={theme.primary}
              onChange={(e) => onChange({ ...theme, primary: e.target.value })}
              spellCheck={false}
              className="h-8 font-mono text-xs"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Ao salvar, o contraste primary/foreground é validado para WCAG AA.
          </p>
        </div>
      </section>

      {/* Raio */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="brand-radius" className="text-xs">
            Arredondamento
          </Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {theme.radius.toFixed(3)}rem
          </span>
        </div>
        <Slider
          id="brand-radius"
          value={[theme.radius]}
          min={0}
          max={1.75}
          step={0.125}
          onValueChange={(v) => onChange({ ...theme, radius: v[0] ?? 0 })}
          aria-label="Raio de canto da marca"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Reto</span>
          <span>Arredondado</span>
        </div>
      </section>

      {/* Fonte */}
      <section className="flex flex-col gap-1.5">
        <Label htmlFor="brand-font" className="text-xs">
          Fonte
        </Label>
        <Select
          value={theme.font}
          onValueChange={(v) => onChange({ ...theme, font: v })}
        >
          <SelectTrigger id="brand-font" size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font.id} value={font.stack}>
                <span style={{ fontFamily: font.stack }}>{font.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {/* Logo placeholder */}
      <section className="flex flex-col gap-1.5">
        <Label className="text-xs">Logo</Label>
        <div className="flex items-center gap-2.5 rounded-lg border border-dashed p-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <ImageIcon className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium">{TENANT_NAME}</span>
            <span className="text-[10px] text-muted-foreground">
              PNG/SVG · até 1 MB (placeholder)
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
