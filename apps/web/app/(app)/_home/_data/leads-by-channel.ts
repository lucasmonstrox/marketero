import type { Channel } from "@/shared/domain/channels"

/**
 * Série "Leads por canal (7 dias)" p/ o gráfico de barras empilhadas. Cada
 * linha é um dia; cada canal vira uma série mapeada a var(--chart-*). Mantém só
 * os canais do MVP que de fato geram leads no mundo da Bella Decor.
 */

export interface LeadsByChannelPoint {
  /** Rótulo curto do dia (eixo X). */
  dia: string
  instagram: number
  facebook: number
  whatsapp: number
  mercadolivre: number
  web: number
}

/** Canais plotados, na ordem das séries do gráfico. */
export const CHART_CHANNELS: Channel[] = [
  "instagram",
  "facebook",
  "whatsapp",
  "mercadolivre",
  "web",
]

export const LEADS_BY_CHANNEL: LeadsByChannelPoint[] = [
  { dia: "Dom", instagram: 12, facebook: 8, whatsapp: 6, mercadolivre: 4, web: 3 },
  { dia: "Seg", instagram: 18, facebook: 11, whatsapp: 9, mercadolivre: 6, web: 5 },
  { dia: "Ter", instagram: 15, facebook: 9, whatsapp: 8, mercadolivre: 5, web: 4 },
  { dia: "Qua", instagram: 21, facebook: 13, whatsapp: 11, mercadolivre: 7, web: 6 },
  { dia: "Qui", instagram: 19, facebook: 12, whatsapp: 10, mercadolivre: 8, web: 5 },
  { dia: "Sex", instagram: 26, facebook: 16, whatsapp: 14, mercadolivre: 9, web: 8 },
  { dia: "Sáb", instagram: 23, facebook: 14, whatsapp: 12, mercadolivre: 7, web: 6 },
]
