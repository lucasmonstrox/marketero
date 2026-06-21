/**
 * Séries temporais multi-métrica p/ o `TimeSeriesChart` (Leads, Conversas,
 * Vendas ao longo do tempo). Cada aba da página (Visão geral, Social,
 * Atendimento, Vendas) consome um conjunto, mas todas seguem o mesmo formato
 * para reaproveitar o componente. Cores vêm de var(--chart-*) via ChartConfig.
 */

export interface TimeSeriesPoint {
  /** Rótulo curto do eixo X (semana do período). */
  semana: string
  leads: number
  conversas: number
  vendas: number
}

/** Visão geral — funil resumido por semana. */
export const TIME_SERIES_GERAL: TimeSeriesPoint[] = [
  { semana: "Sem 1", leads: 248, conversas: 412, vendas: 58 },
  { semana: "Sem 2", leads: 286, conversas: 458, vendas: 64 },
  { semana: "Sem 3", leads: 264, conversas: 431, vendas: 61 },
  { semana: "Sem 4", leads: 312, conversas: 502, vendas: 78 },
  { semana: "Sem 5", leads: 341, conversas: 547, vendas: 84 },
  { semana: "Sem 6", leads: 368, conversas: 589, vendas: 91 },
  { semana: "Sem 7", leads: 392, conversas: 624, vendas: 97 },
  { semana: "Sem 8", leads: 421, conversas: 668, vendas: 104 },
]

/** Social — alcance vs. engajamento vs. leads gerados por conteúdo. */
export const TIME_SERIES_SOCIAL: TimeSeriesPoint[] = [
  { semana: "Sem 1", leads: 142, conversas: 96, vendas: 21 },
  { semana: "Sem 2", leads: 168, conversas: 112, vendas: 26 },
  { semana: "Sem 3", leads: 151, conversas: 104, vendas: 24 },
  { semana: "Sem 4", leads: 189, conversas: 138, vendas: 31 },
  { semana: "Sem 5", leads: 204, conversas: 147, vendas: 34 },
  { semana: "Sem 6", leads: 221, conversas: 162, vendas: 38 },
  { semana: "Sem 7", leads: 238, conversas: 176, vendas: 41 },
  { semana: "Sem 8", leads: 256, conversas: 191, vendas: 45 },
]

/** Atendimento — volume de conversas, resolvidas pela IA e escaladas. */
export const TIME_SERIES_ATENDIMENTO: TimeSeriesPoint[] = [
  { semana: "Sem 1", leads: 412, conversas: 297, vendas: 115 },
  { semana: "Sem 2", leads: 458, conversas: 334, vendas: 124 },
  { semana: "Sem 3", leads: 431, conversas: 318, vendas: 113 },
  { semana: "Sem 4", leads: 502, conversas: 378, vendas: 124 },
  { semana: "Sem 5", leads: 547, conversas: 416, vendas: 131 },
  { semana: "Sem 6", leads: 589, conversas: 452, vendas: 137 },
  { semana: "Sem 7", leads: 624, conversas: 487, vendas: 137 },
  { semana: "Sem 8", leads: 668, conversas: 528, vendas: 140 },
]

/** Vendas — receita (mil R$), ticket médio (R$) e negócios ganhos. */
export const TIME_SERIES_VENDAS: TimeSeriesPoint[] = [
  { semana: "Sem 1", leads: 182, conversas: 41, vendas: 58 },
  { semana: "Sem 2", leads: 214, conversas: 38, vendas: 64 },
  { semana: "Sem 3", leads: 198, conversas: 42, vendas: 61 },
  { semana: "Sem 4", leads: 241, conversas: 44, vendas: 78 },
  { semana: "Sem 5", leads: 267, conversas: 46, vendas: 84 },
  { semana: "Sem 6", leads: 283, conversas: 47, vendas: 91 },
  { semana: "Sem 7", leads: 312, conversas: 49, vendas: 97 },
  { semana: "Sem 8", leads: 339, conversas: 51, vendas: 104 },
]
