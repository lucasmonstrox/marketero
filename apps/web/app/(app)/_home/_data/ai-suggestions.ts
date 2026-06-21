import type { LucideIcon } from "lucide-react"
import { ReplyIcon, ShoppingBagIcon, TriangleAlertIcon } from "lucide-react"

import type { Channel } from "@/shared/domain/channels"

/**
 * "Sugestões da IA" — saídas do GraphRAG que pedem uma decisão do operador.
 * Três arquétipos: responder comentário, sugerir produto (cross-sell), escalar.
 * `confidence` é fração 0–1 (combina com confidenceBand/formatPercent).
 */

export type SuggestionKind = "reply" | "product" | "escalate"

export interface AiSuggestion {
  id: string
  kind: SuggestionKind
  icon: LucideIcon
  channel: Channel
  title: string
  /** Quem/qual contexto originou a sugestão. */
  context: string
  /** Racional do GraphRAG p/ a sugestão. */
  rationale: string
  /** Rótulo do botão de ação primária. */
  action: string
  /** Confiança do modelo (fração 0–1). */
  confidence: number
}

export const AI_SUGGESTIONS: AiSuggestion[] = [
  {
    id: "s1",
    kind: "reply",
    icon: ReplyIcon,
    channel: "instagram",
    title: "Responder comentário com intenção de compra",
    context: "@marina.decora no post do Sofá Oslo",
    rationale: "Pergunta sobre cor + alta intenção. Resposta pronta com link de compra.",
    action: "Revisar resposta",
    confidence: 0.92,
  },
  {
    id: "s2",
    kind: "product",
    icon: ShoppingBagIcon,
    channel: "whatsapp",
    title: "Sugerir Tapete Boucle a Camila Duarte",
    context: "Comprou Sofá Oslo há 2 dias",
    rationale: "Clientes do Sofá Oslo compram o Tapete Boucle em 38% dos casos.",
    action: "Enviar sugestão",
    confidence: 0.74,
  },
  {
    id: "s3",
    kind: "escalate",
    icon: TriangleAlertIcon,
    channel: "whatsapp",
    title: "Escalar reclamação para Ana Souza",
    context: "Tânia Albuquerque — produto avariado",
    rationale: "Tom negativo + cliente recorrente. Recomenda atendimento humano.",
    action: "Escalar agora",
    confidence: 0.88,
  },
]
