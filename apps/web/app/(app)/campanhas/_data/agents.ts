import { AGENT_MODELS } from "@/shared/domain/taxonomy"

/**
 * Mock dos Agentes da "Bella Decor" (agentes.md §9). O Agente é o "motor": a IA
 * conversacional que conduz um Form via FSM. É genérico — não tem perguntas
 * próprias; o conteúdo vem do Form (default ou override por campanha).
 *
 * UI-only — dados fictícios colocados aqui de propósito.
 */

/** Política de escalonamento resumida (agentes.md §10 defaults). */
export interface EscalationPolicy {
  maxDigressions: number
  maxValidationRetries: number
  abandonAfter: string
  reengageBeforeAbandon: boolean
  /** Gatilhos que pulam a retomada e vão direto a humano. */
  immediateEscalation: string[]
}

export interface AgentMetrics {
  conversations: number
  /** Fração 0–1 de conversas que chegaram a `complete`. */
  completionRate: number
  /** Fração 0–1 de conversas que terminaram em `escalate`. */
  escalationRate: number
}

export interface Agent {
  id: string
  name: string
  /** Id do modelo — casa com AGENT_MODELS (agentes.md §9). */
  modelId: string
  /** Persona/system_prompt — mostramos um trecho no card. */
  systemPrompt: string
  /** Form padrão do agente (usado quando a campanha não faz override). */
  defaultFormId: string
  escalationPolicy: EscalationPolicy
  metrics: AgentMetrics
  active: boolean
}

/** Garante que os ids de modelo do mock existem na taxonomia compartilhada. */
const MODEL = {
  opus: AGENT_MODELS[0]!.id,
  sonnet: AGENT_MODELS[1]!.id,
  haiku: AGENT_MODELS[2]!.id,
}

export const AGENTS: Agent[] = [
  {
    id: "agent-clara",
    name: "Clara — Consultora de vendas",
    modelId: MODEL.opus,
    systemPrompt:
      "Você é a Clara, consultora da Bella Decor. Acolhedora e objetiva, conduz o cliente pelo orçamento sem ser insistente. Usa o catálogo (GraphRAG) para sugerir ambientes e nunca avança sem o consentimento de contato.",
    defaultFormId: "form-sob-medida",
    escalationPolicy: {
      maxDigressions: 3,
      maxValidationRetries: 2,
      abandonAfter: "24h",
      reengageBeforeAbandon: true,
      immediateEscalation: ["explicit_human_request", "out_of_scope", "negative_sentiment"],
    },
    metrics: {
      conversations: 1284,
      completionRate: 0.62,
      escalationRate: 0.11,
    },
    active: true,
  },
  {
    id: "agent-rafa",
    name: "Rafa — Recepção e triagem",
    modelId: MODEL.sonnet,
    systemPrompt:
      "Você é o Rafa, recepcionista da Bella Decor. Recebe o lead, entende a necessidade e agenda a consultoria. Tom leve e prestativo; ao menor sinal de urgência ou reclamação, transfere para um atendente humano.",
    defaultFormId: "form-consultoria",
    escalationPolicy: {
      maxDigressions: 4,
      maxValidationRetries: 2,
      abandonAfter: "12h",
      reengageBeforeAbandon: true,
      immediateEscalation: ["explicit_human_request", "negative_sentiment"],
    },
    metrics: {
      conversations: 2107,
      completionRate: 0.74,
      escalationRate: 0.08,
    },
    active: true,
  },
  {
    id: "agent-bel",
    name: "Bel — Promoções e captação",
    modelId: MODEL.haiku,
    systemPrompt:
      "Você é a Bel, da Bella Decor. Rápida e direta, captura o cadastro para a lista VIP de ofertas em pouquíssimos turnos. Não faz consultoria — se o cliente quiser detalhes de projeto, encaminha para a Clara.",
    defaultFormId: "form-mega-saldao",
    escalationPolicy: {
      maxDigressions: 2,
      maxValidationRetries: 1,
      abandonAfter: "6h",
      reengageBeforeAbandon: false,
      immediateEscalation: ["explicit_human_request", "out_of_scope"],
    },
    metrics: {
      conversations: 3640,
      completionRate: 0.81,
      escalationRate: 0.04,
    },
    active: true,
  },
]

export function getAgent(id: string): Agent | undefined {
  return AGENTS.find((agent) => agent.id === id)
}

/** Rótulos legíveis dos gatilhos de escalonamento imediato (pt-BR). */
export const ESCALATION_TRIGGER_LABEL: Record<string, string> = {
  explicit_human_request: "Pediu atendente",
  out_of_scope: "Fora de escopo",
  negative_sentiment: "Sentimento negativo",
}
