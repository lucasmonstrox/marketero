import type { SemanticTone } from "@/shared/domain/taxonomy"

/**
 * Acento da coluna: ou um token de data-viz (`chart`) ou um tom semântico
 * (`tone`). Mapeado para classes literais (o JIT do Tailwind v4 só detecta
 * nomes escritos por inteiro). NUNCA hex cru — validado para contraste AA.
 * Mesmo shape do `AccentSchema` da API (jsonb `stages.accent`).
 */
export type StageAccent =
  | { kind: "chart"; n: 1 | 2 | 3 | 4 | 5 }
  | { kind: "tone"; tone: Extract<SemanticTone, "success" | "destructive"> }

export interface StageAccentClasses {
  /** Faixa de cor no topo da coluna. */
  bar: string
  /** Tinta suave do cabeçalho. */
  soft: string
  /** Texto/realce na cor do acento. */
  text: string
  /** Ponto/indicador sólido. */
  dot: string
  /** Borda na cor do acento. */
  border: string
  /** Anel de foco/hover sutil para o card. */
  ring: string
}

export const STAGE_ACCENT_CLASSES: Record<string, StageAccentClasses> = {
  "chart-1": {
    bar: "bg-chart-1",
    soft: "bg-chart-1/10",
    text: "text-chart-1",
    dot: "bg-chart-1",
    border: "border-chart-1/30",
    ring: "ring-chart-1/40",
  },
  "chart-2": {
    bar: "bg-chart-2",
    soft: "bg-chart-2/10",
    text: "text-chart-2",
    dot: "bg-chart-2",
    border: "border-chart-2/30",
    ring: "ring-chart-2/40",
  },
  "chart-3": {
    bar: "bg-chart-3",
    soft: "bg-chart-3/10",
    text: "text-chart-3",
    dot: "bg-chart-3",
    border: "border-chart-3/30",
    ring: "ring-chart-3/40",
  },
  "chart-4": {
    bar: "bg-chart-4",
    soft: "bg-chart-4/10",
    text: "text-chart-4",
    dot: "bg-chart-4",
    border: "border-chart-4/30",
    ring: "ring-chart-4/40",
  },
  "chart-5": {
    bar: "bg-chart-5",
    soft: "bg-chart-5/10",
    text: "text-chart-5",
    dot: "bg-chart-5",
    border: "border-chart-5/30",
    ring: "ring-chart-5/40",
  },
  success: {
    bar: "bg-success",
    soft: "bg-success/10",
    text: "text-success",
    dot: "bg-success",
    border: "border-success/30",
    ring: "ring-success/40",
  },
  destructive: {
    bar: "bg-destructive",
    soft: "bg-destructive/10",
    text: "text-destructive",
    dot: "bg-destructive",
    border: "border-destructive/30",
    ring: "ring-destructive/40",
  },
}

/** Resolve o acento de uma etapa para a chave do mapa de classes. */
export function accentKey(accent: StageAccent): string {
  return accent.kind === "chart" ? `chart-${accent.n}` : accent.tone
}

/** Chaves de acento na ordem exibida no picker do StageDialog. */
export const ACCENT_OPTIONS: StageAccent[] = [
  { kind: "chart", n: 1 },
  { kind: "chart", n: 2 },
  { kind: "chart", n: 3 },
  { kind: "chart", n: 4 },
  { kind: "chart", n: 5 },
  { kind: "tone", tone: "success" },
  { kind: "tone", tone: "destructive" },
]

/**
 * Normaliza o acento vindo da API (jsonb aberto, pode ser null) para o union
 * fechado da UI. Fallback: rotaciona chart-1..5 pela posição da coluna.
 */
export function normalizeAccent(
  accent: { kind: "chart"; n: number } | { kind: "tone"; tone: string } | null,
  fallbackIndex: number,
): StageAccent {
  if (accent?.kind === "chart" && accent.n >= 1 && accent.n <= 5) {
    return { kind: "chart", n: accent.n as 1 | 2 | 3 | 4 | 5 }
  }
  if (accent?.kind === "tone" && (accent.tone === "success" || accent.tone === "destructive")) {
    return { kind: "tone", tone: accent.tone }
  }
  return { kind: "chart", n: ((fallbackIndex % 5) + 1) as 1 | 2 | 3 | 4 | 5 }
}
