import type { BrandPreset, FontOption, TenantTheme } from "./types"

/**
 * Marca do tenant "Bella Decor" (Eixo B — white-label, design-system §6).
 * Estes valores OKLCH são DADOS da marca do cliente, não cores de UI do
 * produto. São injetados como variáveis CSS no escopo `[data-tenant]` do
 * preview; os blocos consomem `var(--primary)`, então trocar aqui re-tematiza
 * tudo ao vivo, sem rebuild.
 */

export const TENANT_NAME = "Bella Decor"
export const TENANT_DOMAIN = "promo.belladecor.com.br"

/** Swatches de cor de marca pré-definidos (o operador também pode customizar). */
export const BRAND_PRESETS: BrandPreset[] = [
  { id: "terracota", label: "Terracota", value: "oklch(0.58 0.15 38)" },
  { id: "verde-oliva", label: "Verde oliva", value: "oklch(0.55 0.1 135)" },
  { id: "azul-petroleo", label: "Azul petróleo", value: "oklch(0.52 0.1 220)" },
  { id: "vinho", label: "Vinho", value: "oklch(0.48 0.16 18)" },
  { id: "mostarda", label: "Mostarda", value: "oklch(0.72 0.15 85)" },
  { id: "grafite", label: "Grafite", value: "oklch(0.42 0.02 280)" },
]

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "sans-padrao",
    label: "Sans (padrão)",
    stack: "var(--font-sans)",
  },
  {
    id: "georgia",
    label: "Serifada (Georgia)",
    stack: "Georgia, 'Times New Roman', serif",
  },
  {
    id: "system",
    label: "Sistema",
    stack:
      "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: "mono",
    label: "Mono",
    stack: "ui-monospace, 'SFMono-Regular', 'Cascadia Code', monospace",
  },
]

/** Tema inicial do tenant: terracota, cantos generosos, fonte serifada. */
export const INITIAL_THEME: TenantTheme = {
  primary: BRAND_PRESETS[0]!.value,
  radius: 0.875,
  font: FONT_OPTIONS[1]!.stack,
}
