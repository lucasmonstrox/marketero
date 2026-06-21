/**
 * "Horário de engajamento" — intensidade de conversas por dia da semana × faixa
 * horária, p/ o heatmap. `value` é 0–100 (intensidade relativa); o componente
 * mapeia em uma rampa sequencial de tinta da marca (var(--chart-1)). Ajuda a
 * achar a janela onde a equipe deve reforçar atendimento.
 */

export const ENGAGEMENT_DAYS = [
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
  "Dom",
] as const

export const ENGAGEMENT_SLOTS = ["06h", "09h", "12h", "15h", "18h", "21h"] as const

export type EngagementDay = (typeof ENGAGEMENT_DAYS)[number]

export interface EngagementCell {
  day: EngagementDay
  /** Índice da faixa horária em ENGAGEMENT_SLOTS. */
  slot: number
  /** Intensidade 0–100. */
  value: number
}

/** Matriz dias × faixas (valores 0–100). Pico no fim de tarde/noite. */
const MATRIX: Record<EngagementDay, number[]> = {
  Seg: [12, 38, 54, 61, 78, 64],
  Ter: [14, 41, 58, 66, 82, 71],
  Qua: [11, 36, 51, 63, 80, 68],
  Qui: [16, 44, 62, 71, 88, 76],
  Sex: [18, 47, 66, 74, 92, 84],
  Sáb: [22, 52, 71, 68, 74, 58],
  Dom: [19, 43, 59, 55, 61, 47],
}

export const ENGAGEMENT_CELLS: EngagementCell[] = ENGAGEMENT_DAYS.flatMap((day) =>
  MATRIX[day].map((value, slot) => ({ day, slot, value }))
)
