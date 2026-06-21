import type { Channel } from "@/shared/domain/channels"

/**
 * Volume por canal p/ o `ChannelBreakdown` (barras horizontais). Aqui a cor do
 * canal é CATEGORIA legítima — métricas é o lugar onde comparamos canais entre
 * si — então usamos var(--color-channel-*) via CHANNEL_META, não a escala
 * var(--chart-*). Só canais do MVP da Bella Decor.
 */

export interface ChannelVolume {
  channel: Channel
  /** Leads originados no canal no período. */
  leads: number
  /** Conversas atendidas no canal. */
  conversas: number
  /** Receita atribuída ao canal (centavos). */
  receitaCents: number
}

export const CHANNEL_BREAKDOWN: ChannelVolume[] = [
  {
    channel: "instagram",
    leads: 486,
    conversas: 612,
    receitaCents: 6_840_000,
  },
  {
    channel: "whatsapp",
    leads: 312,
    conversas: 894,
    receitaCents: 5_120_000,
  },
  {
    channel: "mercadolivre",
    leads: 248,
    conversas: 187,
    receitaCents: 3_960_000,
  },
  {
    channel: "facebook",
    leads: 164,
    conversas: 241,
    receitaCents: 1_980_000,
  },
  {
    channel: "web",
    leads: 74,
    conversas: 58,
    receitaCents: 840_000,
  },
]
