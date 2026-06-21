import type { LucideIcon } from "lucide-react"
import {
  ArrowRightLeftIcon,
  MoveRightIcon,
  ReplyIcon,
  SparklesIcon,
  UserPlusIcon,
} from "lucide-react"

import type { Channel } from "@/shared/domain/channels"
import type { Intent } from "@/shared/domain/taxonomy"
import { hoursAgo as hr, minutesAgo as min } from "@/shared/lib/mock-time"

/**
 * Feed "Atividade recente" — materializa o modelo evento → classificação →
 * ação. Cada item carrega o canal de origem (acento via ChannelIcon), o tipo
 * de evento (define o ícone neutro) e, quando aplicável, a classificação de IA
 * (`intent`) ou a marca de ação automática (`ai`).
 */

export type ActivityKind =
  | "classification"
  | "lead"
  | "stage_move"
  | "ai_action"
  | "conversion"

export interface ActivityItem {
  id: string
  kind: ActivityKind
  channel: Channel
  /** Ícone neutro do tipo de evento (lucide). */
  icon: LucideIcon
  title: string
  /** Detalhe secundário: nome do lead, produto, valor, etc. */
  detail: string
  /** Classificação de IA, quando o evento foi classificado. */
  intent?: Intent
  /** Marca como ação executada pela IA (recebe AiTag). */
  ai?: boolean
  /** ISO timestamp p/ formatRelative. */
  at: string
}

export const ACTIVITY: ActivityItem[] = [
  {
    id: "a1",
    kind: "classification",
    channel: "instagram",
    icon: SparklesIcon,
    title: "Comentário no Instagram classificado",
    detail: "“Esse sofá vem em cinza? Quero comprar” — @marina.decora",
    intent: "intencao_de_compra",
    ai: true,
    at: min(3),
  },
  {
    id: "a2",
    kind: "lead",
    channel: "facebook",
    icon: UserPlusIcon,
    title: "Novo lead via Lead Ads",
    detail: "Rafael Mendes — campanha “Inverno Aconchego”",
    at: min(14),
  },
  {
    id: "a3",
    kind: "ai_action",
    channel: "whatsapp",
    icon: ReplyIcon,
    title: "IA respondeu no WhatsApp",
    detail: "Enviado catálogo do Sofá Oslo 3 lugares a Camila Duarte",
    ai: true,
    at: min(28),
  },
  {
    id: "a4",
    kind: "stage_move",
    channel: "mercadolivre",
    icon: MoveRightIcon,
    title: "Card movido para Qualificado",
    detail: "Bruno Carvalho — interesse em Luminária Lumi (x2)",
    at: min(46),
  },
  {
    id: "a5",
    kind: "conversion",
    channel: "facebook",
    icon: ArrowRightLeftIcon,
    title: "Conversão devolvida à Meta (CAPI)",
    detail: "Compra R$ 2.690,00 atribuída a “Inverno Aconchego”",
    at: hr(1.4),
  },
  {
    id: "a6",
    kind: "classification",
    channel: "instagram",
    icon: SparklesIcon,
    title: "Comentário no Instagram classificado",
    detail: "“Amei a entrega, chegou super rápido!” — @casa.da.bia",
    intent: "elogio",
    ai: true,
    at: hr(2.1),
  },
  {
    id: "a7",
    kind: "ai_action",
    channel: "web",
    icon: SparklesIcon,
    title: "IA sugeriu produto na loja",
    detail: "Tapete Boucle recomendado junto ao Sofá Oslo",
    ai: true,
    at: hr(3.5),
  },
  {
    id: "a8",
    kind: "classification",
    channel: "whatsapp",
    icon: SparklesIcon,
    title: "Mensagem no WhatsApp classificada",
    detail: "“Meu pedido veio com a perna torta” — Tânia Albuquerque",
    intent: "reclamacao",
    ai: true,
    at: hr(5),
  },
  {
    id: "a9",
    kind: "lead",
    channel: "mercadolivre",
    icon: UserPlusIcon,
    title: "Nova pergunta no Mercado Livre",
    detail: "Dúvida sobre prazo de entrega da Poltrona Nórdica",
    intent: "duvida",
    at: hr(6.5),
  },
  {
    id: "a10",
    kind: "stage_move",
    channel: "instagram",
    icon: MoveRightIcon,
    title: "Card movido para Proposta",
    detail: "Marina Castro — orçamento de mesa de jantar enviado",
    at: hr(8),
  },
]
