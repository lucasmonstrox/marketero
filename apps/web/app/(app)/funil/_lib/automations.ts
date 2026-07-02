import type { Channel } from "@/shared/domain/channels"
import type { StageType } from "@/shared/domain/taxonomy"

/**
 * Catálogo de automações por etapa (triggers MOVEM o card; robôs AGEM na
 * etapa), conforme funcionalidades/kanban.md. Ainda UI-only: a API não modela
 * automações — as etapas reais recebem um preset por `stage.type` e os
 * toggles vivem em estado local até existir backend para isso.
 */

/** Catálogo de tipos de TRIGGER (inbound — MOVEM o card para a etapa). */
export type TriggerType =
  | "comment_ig_fb"
  | "dm_received"
  | "whatsapp_received"
  | "leadgen"
  | "web_form"
  | "store_order_paid"
  | "marketplace_question"
  | "marketplace_order_paid"
  | "ai_intent"
  | "no_reply_timer"

/** Catálogo de tipos de ROBÔ (outbound — AGEM quando o card chega/permanece). */
export type RobotType =
  | "respond_graphrag"
  | "suggest_product"
  | "escalate_human"
  | "tag"
  | "send_whatsapp"
  | "create_task"
  | "assign_owner"
  | "delay"
  | "arm_sla_timer"
  | "capi"

export interface TriggerMeta {
  type: TriggerType
  label: string
  /** Como o evento chega: canal real, classificador de IA ou timer interno. */
  source: "channel" | "ai" | "timer"
  /** Canal associado (quando aplicável) — pinta o ícone. */
  channel?: Channel
  hint: string
}

export interface RobotMeta {
  type: RobotType
  label: string
  /** Robôs de IA (GraphRAG) recebem tratamento de IA na UI. */
  ai?: boolean
  /** Canal associado (quando aplicável). */
  channel?: Channel
  hint: string
}

export const TRIGGER_META: Record<TriggerType, TriggerMeta> = {
  comment_ig_fb: {
    type: "comment_ig_fb",
    label: "Comentário no IG/FB",
    source: "channel",
    channel: "instagram",
    hint: "Webhook de comentário (classificação roda na ingestão)",
  },
  dm_received: {
    type: "dm_received",
    label: "DM recebida",
    source: "channel",
    channel: "instagram",
    hint: "Primeira mensagem do contato no Direct / Messenger",
  },
  whatsapp_received: {
    type: "whatsapp_received",
    label: "WhatsApp recebido",
    source: "channel",
    channel: "whatsapp",
    hint: "Mensagem nova na WhatsApp Cloud API",
  },
  leadgen: {
    type: "leadgen",
    label: "Lead Ads (leadgen)",
    source: "channel",
    channel: "facebook",
    hint: "Webhook leadgen — re-busca o lead pelo ID",
  },
  web_form: {
    type: "web_form",
    label: "Formulário web",
    source: "channel",
    channel: "web",
    hint: "Submissão do formulário hospedado do Marketero",
  },
  store_order_paid: {
    type: "store_order_paid",
    label: "Pedido pago na loja",
    source: "channel",
    channel: "web",
    hint: "order_paid da loja própria → move para Ganho e dispara CAPI",
  },
  marketplace_question: {
    type: "marketplace_question",
    label: "Pergunta em marketplace",
    source: "channel",
    channel: "mercadolivre",
    hint: "Pergunta recebida no Mercado Livre / marketplace",
  },
  marketplace_order_paid: {
    type: "marketplace_order_paid",
    label: "Pedido pago em marketplace",
    source: "channel",
    channel: "mercadolivre",
    hint: "order_paid do marketplace → move para Ganho",
  },
  ai_intent: {
    type: "ai_intent",
    label: "Intenção de compra (IA)",
    source: "ai",
    hint: "ai.intent_detected com confiança ≥ 0,80 na ingestão",
  },
  no_reply_timer: {
    type: "no_reply_timer",
    label: "Sem resposta por X tempo",
    source: "timer",
    hint: "Disparo de timer de SLA armado por um robô ao entrar na etapa",
  },
}

export const ROBOT_META: Record<RobotType, RobotMeta> = {
  respond_graphrag: {
    type: "respond_graphrag",
    label: "Responder via GraphRAG",
    ai: true,
    hint: "Resposta contextualizada pelo grafo (clientes, produtos, conversas)",
  },
  suggest_product: {
    type: "suggest_product",
    label: "Sugerir produto do grafo",
    ai: true,
    hint: "Cruza grafo de produto + histórico do contato",
  },
  escalate_human: {
    type: "escalate_human",
    label: "Escalar para humano",
    hint: "Aplica tag HUMAN_AGENT, troca responsável e entrega contexto",
  },
  tag: {
    type: "tag",
    label: "Etiquetar",
    hint: "Aplica labels ao card (intenção, canal, campanha)",
  },
  send_whatsapp: {
    type: "send_whatsapp",
    label: "Enviar WhatsApp / template",
    channel: "whatsapp",
    hint: "Envia mensagem por template ou dinâmica no canal",
  },
  create_task: {
    type: "create_task",
    label: "Criar tarefa",
    hint: "Cria tarefa para o time (handoff IA → humano)",
  },
  assign_owner: {
    type: "assign_owner",
    label: "Atribuir responsável",
    hint: "Distribuição por rodízio, região, interesse ou carga",
  },
  delay: {
    type: "delay",
    label: "Esperar / delay",
    hint: "Suspende a cadência sem bloquear worker (ex.: follow-up 24h)",
  },
  arm_sla_timer: {
    type: "arm_sla_timer",
    label: "Armar timer de SLA",
    hint: "Cria o scheduled_task cujo disparo age como trigger de movimentação",
  },
  capi: {
    type: "capi",
    label: "Devolver conversão (CAPI)",
    hint: "POST ao dataset da Meta, gravando conversion_synced_at",
  },
}

export interface StageTrigger {
  id: string
  type: TriggerType
  enabled: boolean
  /** Override de rótulo quando quer detalhar a condição. */
  detail?: string
}

export interface StageRobot {
  id: string
  type: RobotType
  enabled: boolean
  detail?: string
}

/** Preset de triggers/robôs por papel da etapa (demo rica até existir backend). */
const PRESETS: Record<StageType, { triggers: TriggerType[]; robots: RobotType[] }> = {
  new: {
    triggers: ["leadgen", "comment_ig_fb", "web_form", "dm_received"],
    robots: ["respond_graphrag", "assign_owner", "arm_sla_timer"],
  },
  active: {
    triggers: ["ai_intent", "whatsapp_received", "no_reply_timer"],
    robots: ["respond_graphrag", "suggest_product", "send_whatsapp"],
  },
  won: {
    triggers: ["store_order_paid", "marketplace_order_paid"],
    robots: ["capi", "tag"],
  },
  lost: {
    triggers: ["no_reply_timer"],
    robots: ["tag", "delay"],
  },
}

/** Automações default (mock) de uma etapa real, com ids determinísticos. */
export function defaultAutomationsFor(
  stageId: string,
  type: StageType,
): { triggers: StageTrigger[]; robots: StageRobot[] } {
  const preset = PRESETS[type]
  return {
    triggers: preset.triggers.map((t) => ({ id: `${stageId}-t-${t}`, type: t, enabled: true })),
    robots: preset.robots.map((r) => ({ id: `${stageId}-r-${r}`, type: r, enabled: true })),
  }
}
