import type { Channel } from "@/shared/domain/channels"
import type { SemanticTone } from "@/shared/domain/taxonomy"

/**
 * "Canais conectados" — estado da integração de cada canal da Bella Decor.
 * `tone` mapeia o status p/ a escala semântica (verde = conectado, âmbar =
 * pendente). A cor nunca é o único sinal: o rótulo de status acompanha sempre.
 */

export type ConnectionStatus = "connected" | "pending"

export interface ChannelConnection {
  channel: Channel
  status: ConnectionStatus
  /** Métrica de contexto da conexão (ex.: leads no período). */
  meta: string
}

export const CONNECTION_STATUS_META: Record<
  ConnectionStatus,
  { label: string; tone: SemanticTone }
> = {
  connected: { label: "Conectado", tone: "success" },
  pending: { label: "Pendente", tone: "warning" },
}

export const CHANNEL_CONNECTIONS: ChannelConnection[] = [
  { channel: "instagram", status: "connected", meta: "134 leads · 7 dias" },
  { channel: "facebook", status: "connected", meta: "83 leads · 7 dias" },
  { channel: "whatsapp", status: "connected", meta: "70 leads · 7 dias" },
  { channel: "mercadolivre", status: "connected", meta: "46 leads · 7 dias" },
  { channel: "web", status: "pending", meta: "Aguardando pixel da loja" },
]
