import type { Channel } from "@/shared/domain/channels"
import type {
  AutomationState,
  Intent,
  SemanticTone,
  StageType,
} from "@/shared/domain/taxonomy"
import { daysAgo, hoursAgo, minutesAgo } from "@/shared/lib/mock-time"

/**
 * Mock do funil Kanban da tenant fictícia "Bella Decor" (operadora Ana Souza).
 * UI-only — dados colocados. Modela pipelines → etapas → cards + o catálogo de
 * automações por etapa (triggers que MOVEM o card vs robôs que AGEM na etapa),
 * conforme funcionalidades/kanban.md. Toda cor de etapa vem daqui (token de
 * chart ou tom semântico), nunca hex cru.
 */

/* ------------------------------ Responsáveis ----------------------------- */

export interface TeamMember {
  id: string
  name: string
  initials: string
}

export const TEAM: Record<string, TeamMember> = {
  ana: { id: "ana", name: "Ana Souza", initials: "AS" },
  bruno: { id: "bruno", name: "Bruno Carvalho", initials: "BC" },
  carla: { id: "carla", name: "Carla Nunes", initials: "CN" },
  diego: { id: "diego", name: "Diego Ramos", initials: "DR" },
  ia: { id: "ia", name: "Agente GraphRAG", initials: "IA" },
}

/* -------------------------- Acento de etapa ------------------------------ */

/**
 * Acento da coluna: ou um token de data-viz (`chart`) ou um tom semântico
 * (`tone`). Mapeado para classes literais (o JIT do Tailwind v4 só detecta
 * nomes escritos por inteiro). NUNCA hex cru — validado para contraste AA.
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

/* ------------------------------ Automações ------------------------------- */

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
  /** Override de rótulo quando o mock quer detalhar a condição. */
  detail?: string
}

export interface StageRobot {
  id: string
  type: RobotType
  enabled: boolean
  detail?: string
}

/* ------------------------------- Cards ----------------------------------- */

export interface LeadCard {
  id: string
  contactName: string
  /** Empresa/origem ou produto de interesse — linha secundária. */
  subtitle: string
  valueCents: number
  channel: Channel
  intent: Intent
  ownerId: string
  /** ISO — base do "tempo na etapa" via formatRelative. */
  enteredAt: string
  tags: string[]
  automation: AutomationState
  /** Texto curto do que a automação está fazendo (timer/robô). */
  automationDetail?: string
  /** Quando há sugestão/ação pendente da IA → recebe AiTag. */
  aiSuggestion?: string
}

export interface Stage {
  id: string
  name: string
  type: StageType
  accent: StageAccent
  /** Limite de WIP (work-in-progress) da etapa; 0 = sem limite. */
  wipLimit: number
  triggers: StageTrigger[]
  robots: StageRobot[]
  cards: LeadCard[]
}

export interface Pipeline {
  id: string
  name: string
  stages: Stage[]
}

/* --------------------------- Funil de Vendas ----------------------------- */

const vendas: Pipeline = {
  id: "vendas",
  name: "Vendas",
  stages: [
    {
      id: "novo",
      name: "Novo",
      type: "new",
      accent: { kind: "chart", n: 1 },
      wipLimit: 0,
      triggers: [
        { id: "t-novo-1", type: "leadgen", enabled: true },
        { id: "t-novo-2", type: "comment_ig_fb", enabled: true },
        { id: "t-novo-3", type: "web_form", enabled: true },
        { id: "t-novo-4", type: "dm_received", enabled: false },
      ],
      robots: [
        {
          id: "r-novo-1",
          type: "respond_graphrag",
          enabled: true,
          detail: "Primeira resposta (condição: ainda não respondido)",
        },
        { id: "r-novo-2", type: "assign_owner", enabled: true },
        {
          id: "r-novo-3",
          type: "arm_sla_timer",
          enabled: true,
          detail: "Sem contato em 15 min → escalar",
        },
      ],
      cards: [
        {
          id: "c-1",
          contactName: "Mariana Lopes",
          subtitle: "Lead Ads · Sala de estar",
          valueCents: 348000,
          channel: "facebook",
          intent: "intencao_de_compra",
          ownerId: "ana",
          enteredAt: minutesAgo(8),
          tags: ["Lead Ads", "SP"],
          automation: "running",
          automationDetail: "Respondendo via GraphRAG",
          aiSuggestion: "Sugerir conjunto de sofá modular",
        },
        {
          id: "c-2",
          contactName: "Rafael Teixeira",
          subtitle: "Comentário no Instagram",
          valueCents: 89000,
          channel: "instagram",
          intent: "duvida",
          ownerId: "ia",
          enteredAt: minutesAgo(34),
          tags: ["Comentário"],
          automation: "waiting",
          automationDetail: "Timer de SLA · 15 min",
        },
        {
          id: "c-3",
          contactName: "Loja Casa & Cia",
          subtitle: "Formulário web · Atacado",
          valueCents: 1240000,
          channel: "web",
          intent: "intencao_de_compra",
          ownerId: "bruno",
          enteredAt: hoursAgo(3),
          tags: ["Atacado", "B2B"],
          automation: "idle",
        },
        {
          id: "c-4",
          contactName: "Patrícia Gomes",
          subtitle: "Pergunta no Mercado Livre",
          valueCents: 52000,
          channel: "mercadolivre",
          intent: "duvida",
          ownerId: "ia",
          enteredAt: minutesAgo(52),
          tags: ["Marketplace"],
          automation: "waiting",
          automationDetail: "Aguardando classificação da IA",
        },
      ],
    },
    {
      id: "contatado",
      name: "Contatado",
      type: "active",
      accent: { kind: "chart", n: 2 },
      wipLimit: 8,
      triggers: [
        { id: "t-cont-1", type: "whatsapp_received", enabled: true },
        { id: "t-cont-2", type: "dm_received", enabled: true },
        { id: "t-cont-3", type: "marketplace_question", enabled: true },
      ],
      robots: [
        { id: "r-cont-1", type: "tag", enabled: true },
        {
          id: "r-cont-2",
          type: "arm_sla_timer",
          enabled: true,
          detail: "Sem resposta em 3 dias → reativação",
        },
        { id: "r-cont-3", type: "suggest_product", enabled: false },
      ],
      cards: [
        {
          id: "c-5",
          contactName: "Eduardo Martins",
          subtitle: "Cozinha planejada",
          valueCents: 875000,
          channel: "whatsapp",
          intent: "intencao_de_compra",
          ownerId: "carla",
          enteredAt: hoursAgo(6),
          tags: ["Planejados", "Quente"],
          automation: "completed",
          automationDetail: "WhatsApp enviado",
        },
        {
          id: "c-6",
          contactName: "Juliana Prado",
          subtitle: "Dúvida sobre prazo de entrega",
          valueCents: 134000,
          channel: "instagram",
          intent: "duvida",
          ownerId: "ana",
          enteredAt: hoursAgo(20),
          tags: ["Entrega"],
          automation: "idle",
          aiSuggestion: "Responder prazo a partir do CEP do contato",
        },
        {
          id: "c-7",
          contactName: "Marcos Vinícius",
          subtitle: "Reclamação de atraso",
          valueCents: 42000,
          channel: "whatsapp",
          intent: "reclamacao",
          ownerId: "diego",
          enteredAt: daysAgo(2),
          tags: ["Pós-venda", "Atenção"],
          automation: "escalated",
          automationDetail: "Escalado para Diego",
        },
      ],
    },
    {
      id: "qualificado",
      name: "Qualificado",
      type: "active",
      accent: { kind: "chart", n: 3 },
      wipLimit: 6,
      triggers: [
        { id: "t-qual-1", type: "ai_intent", enabled: true },
        { id: "t-qual-2", type: "whatsapp_received", enabled: false },
      ],
      robots: [
        { id: "r-qual-1", type: "suggest_product", enabled: true },
        {
          id: "r-qual-2",
          type: "capi",
          enabled: true,
          detail: "Evento qualified_lead (action_source system_generated)",
        },
        { id: "r-qual-3", type: "create_task", enabled: true },
      ],
      cards: [
        {
          id: "c-8",
          contactName: "Fernanda Ribeiro",
          subtitle: "Home office completo",
          valueCents: 619000,
          channel: "whatsapp",
          intent: "intencao_de_compra",
          ownerId: "carla",
          enteredAt: hoursAgo(9),
          tags: ["Quente", "SP"],
          automation: "completed",
          automationDetail: "CAPI enviado",
          aiSuggestion: "Sugerir cadeira ergonômica do grafo",
        },
        {
          id: "c-9",
          contactName: "Construtora Horizonte",
          subtitle: "Mobiliário corporativo",
          valueCents: 4850000,
          channel: "web",
          intent: "intencao_de_compra",
          ownerId: "bruno",
          enteredAt: daysAgo(1),
          tags: ["B2B", "Alto valor"],
          automation: "running",
          automationDetail: "Criando tarefa para Bruno",
        },
      ],
    },
    {
      id: "proposta",
      name: "Proposta",
      type: "active",
      accent: { kind: "chart", n: 4 },
      wipLimit: 5,
      triggers: [{ id: "t-prop-1", type: "no_reply_timer", enabled: true }],
      robots: [
        {
          id: "r-prop-1",
          type: "send_whatsapp",
          enabled: true,
          detail: "Template proposta_enviada",
        },
        {
          id: "r-prop-2",
          type: "delay",
          enabled: true,
          detail: "Follow-up em 2 dias",
        },
        { id: "r-prop-3", type: "create_task", enabled: false },
      ],
      cards: [
        {
          id: "c-10",
          contactName: "Eduardo Martins",
          subtitle: "Proposta cozinha · 3 ambientes",
          valueCents: 875000,
          channel: "whatsapp",
          intent: "intencao_de_compra",
          ownerId: "carla",
          enteredAt: daysAgo(1),
          tags: ["Planejados"],
          automation: "waiting",
          automationDetail: "Follow-up em 2 dias",
        },
        {
          id: "c-11",
          contactName: "Ateliê Bem Viver",
          subtitle: "Proposta decoração comercial",
          valueCents: 1560000,
          channel: "instagram",
          intent: "intencao_de_compra",
          ownerId: "ana",
          enteredAt: daysAgo(3),
          tags: ["B2B"],
          automation: "idle",
          aiSuggestion: "Lembrar follow-up — sem resposta há 3 dias",
        },
      ],
    },
    {
      id: "ganho",
      name: "Ganho",
      type: "won",
      accent: { kind: "tone", tone: "success" },
      wipLimit: 0,
      triggers: [
        { id: "t-ganho-1", type: "store_order_paid", enabled: true },
        { id: "t-ganho-2", type: "marketplace_order_paid", enabled: true },
      ],
      robots: [
        {
          id: "r-ganho-1",
          type: "capi",
          enabled: true,
          detail: "Evento Purchase",
        },
        { id: "r-ganho-2", type: "tag", enabled: true },
        { id: "r-ganho-3", type: "create_task", enabled: true },
      ],
      cards: [
        {
          id: "c-12",
          contactName: "Sônia Albuquerque",
          subtitle: "Pedido pago · Loja própria",
          valueCents: 298000,
          channel: "web",
          intent: "intencao_de_compra",
          ownerId: "ana",
          enteredAt: hoursAgo(5),
          tags: ["Loja", "Ganho"],
          automation: "completed",
          automationDetail: "Conversão devolvida (CAPI)",
        },
        {
          id: "c-13",
          contactName: "Roberto Lima",
          subtitle: "Pedido pago · Mercado Livre",
          valueCents: 76000,
          channel: "mercadolivre",
          intent: "intencao_de_compra",
          ownerId: "ia",
          enteredAt: daysAgo(1),
          tags: ["Marketplace", "Ganho"],
          automation: "completed",
        },
      ],
    },
    {
      id: "perdido",
      name: "Perdido",
      type: "lost",
      accent: { kind: "tone", tone: "destructive" },
      wipLimit: 0,
      triggers: [],
      robots: [
        { id: "r-perd-1", type: "tag", enabled: true },
        {
          id: "r-perd-2",
          type: "arm_sla_timer",
          enabled: false,
          detail: "Reengajar em 30 dias",
        },
      ],
      cards: [
        {
          id: "c-14",
          contactName: "Gabriel Souza",
          subtitle: "Sem orçamento neste mês",
          valueCents: 210000,
          channel: "whatsapp",
          intent: "duvida",
          ownerId: "diego",
          enteredAt: daysAgo(5),
          tags: ["Frio"],
          automation: "idle",
        },
      ],
    },
  ],
}

/* --------------------------- Funil de Atendimento ------------------------ */

const atendimento: Pipeline = {
  id: "atendimento",
  name: "Atendimento",
  stages: [
    {
      id: "at-novo",
      name: "Novo",
      type: "new",
      accent: { kind: "chart", n: 2 },
      wipLimit: 0,
      triggers: [
        { id: "t-at-1", type: "whatsapp_received", enabled: true },
        { id: "t-at-2", type: "comment_ig_fb", enabled: true },
        { id: "t-at-3", type: "marketplace_question", enabled: true },
      ],
      robots: [
        { id: "r-at-1", type: "respond_graphrag", enabled: true },
        { id: "r-at-2", type: "tag", enabled: true },
      ],
      cards: [
        {
          id: "at-c-1",
          contactName: "Helena Castro",
          subtitle: "Status do meu pedido?",
          valueCents: 0,
          channel: "whatsapp",
          intent: "duvida",
          ownerId: "ia",
          enteredAt: minutesAgo(4),
          tags: ["Pedido"],
          automation: "running",
          automationDetail: "Respondendo via GraphRAG",
        },
        {
          id: "at-c-2",
          contactName: "Paulo Henrique",
          subtitle: "Produto chegou danificado",
          valueCents: 0,
          channel: "instagram",
          intent: "reclamacao",
          ownerId: "ia",
          enteredAt: minutesAgo(22),
          tags: ["Avaria"],
          automation: "waiting",
          automationDetail: "Aguardando classificação",
          aiSuggestion: "Abrir troca e escalar para humano",
        },
      ],
    },
    {
      id: "at-andamento",
      name: "Em atendimento",
      type: "active",
      accent: { kind: "chart", n: 3 },
      wipLimit: 10,
      triggers: [{ id: "t-at-4", type: "whatsapp_received", enabled: true }],
      robots: [
        { id: "r-at-3", type: "assign_owner", enabled: true },
        {
          id: "r-at-4",
          type: "arm_sla_timer",
          enabled: true,
          detail: "SLA de resposta · 2h",
        },
      ],
      cards: [
        {
          id: "at-c-3",
          contactName: "Camila Fernandes",
          subtitle: "Troca de cor do produto",
          valueCents: 0,
          channel: "whatsapp",
          intent: "suporte",
          ownerId: "carla",
          enteredAt: hoursAgo(2),
          tags: ["Troca"],
          automation: "waiting",
          automationDetail: "SLA · 2h",
        },
      ],
    },
    {
      id: "at-escalado",
      name: "Escalado",
      type: "active",
      accent: { kind: "chart", n: 4 },
      wipLimit: 4,
      triggers: [{ id: "t-at-5", type: "no_reply_timer", enabled: true }],
      robots: [
        { id: "r-at-5", type: "create_task", enabled: true },
        { id: "r-at-6", type: "assign_owner", enabled: true },
      ],
      cards: [
        {
          id: "at-c-4",
          contactName: "Vanessa Moraes",
          subtitle: "Reembolso pendente há 5 dias",
          valueCents: 0,
          channel: "facebook",
          intent: "reclamacao",
          ownerId: "diego",
          enteredAt: daysAgo(1),
          tags: ["Reembolso", "Atenção"],
          automation: "escalated",
          automationDetail: "Escalado para Diego",
        },
      ],
    },
    {
      id: "at-resolvido",
      name: "Resolvido",
      type: "won",
      accent: { kind: "tone", tone: "success" },
      wipLimit: 0,
      triggers: [],
      robots: [
        { id: "r-at-7", type: "tag", enabled: true },
        { id: "r-at-8", type: "create_task", enabled: false },
      ],
      cards: [
        {
          id: "at-c-5",
          contactName: "Lucas Almeida",
          subtitle: "Dúvida de montagem resolvida",
          valueCents: 0,
          channel: "whatsapp",
          intent: "elogio",
          ownerId: "ana",
          enteredAt: hoursAgo(7),
          tags: ["Resolvido"],
          automation: "completed",
        },
      ],
    },
  ],
}

/* ----------------------- Recuperação de carrinho ------------------------- */

const recuperacao: Pipeline = {
  id: "recuperacao",
  name: "Recuperação de carrinho",
  stages: [
    {
      id: "rc-abandonado",
      name: "Carrinho abandonado",
      type: "new",
      accent: { kind: "chart", n: 5 },
      wipLimit: 0,
      triggers: [
        { id: "t-rc-1", type: "web_form", enabled: true },
        { id: "t-rc-2", type: "ai_intent", enabled: true },
      ],
      robots: [
        {
          id: "r-rc-1",
          type: "arm_sla_timer",
          enabled: true,
          detail: "1h após abandono → primeira mensagem",
        },
        { id: "r-rc-2", type: "tag", enabled: true },
      ],
      cards: [
        {
          id: "rc-c-1",
          contactName: "Tatiane Cardoso",
          subtitle: "Luminária pendente + 2 itens",
          valueCents: 47000,
          channel: "web",
          intent: "intencao_de_compra",
          ownerId: "ia",
          enteredAt: minutesAgo(45),
          tags: ["Carrinho"],
          automation: "waiting",
          automationDetail: "Timer · 1h",
        },
        {
          id: "rc-c-2",
          contactName: "André Figueiredo",
          subtitle: "Tapete sala 2,5m",
          valueCents: 32000,
          channel: "web",
          intent: "intencao_de_compra",
          ownerId: "ia",
          enteredAt: hoursAgo(2),
          tags: ["Carrinho"],
          automation: "idle",
        },
      ],
    },
    {
      id: "rc-cadencia",
      name: "Cadência ativa",
      type: "active",
      accent: { kind: "chart", n: 4 },
      wipLimit: 12,
      triggers: [{ id: "t-rc-3", type: "whatsapp_received", enabled: true }],
      robots: [
        {
          id: "r-rc-3",
          type: "send_whatsapp",
          enabled: true,
          detail: "Template carrinho_lembrete",
        },
        {
          id: "r-rc-4",
          type: "delay",
          enabled: true,
          detail: "Espera 24h entre mensagens",
        },
        { id: "r-rc-5", type: "suggest_product", enabled: true },
      ],
      cards: [
        {
          id: "rc-c-3",
          contactName: "Beatriz Nogueira",
          subtitle: "Cabeceira estofada",
          valueCents: 89000,
          channel: "whatsapp",
          intent: "intencao_de_compra",
          ownerId: "ia",
          enteredAt: hoursAgo(20),
          tags: ["Cadência"],
          automation: "waiting",
          automationDetail: "Espera 24h",
          aiSuggestion: "Oferecer cupom de 5% no fechamento",
        },
      ],
    },
    {
      id: "rc-recuperado",
      name: "Recuperado",
      type: "won",
      accent: { kind: "tone", tone: "success" },
      wipLimit: 0,
      triggers: [{ id: "t-rc-4", type: "store_order_paid", enabled: true }],
      robots: [
        { id: "r-rc-6", type: "capi", enabled: true, detail: "Evento Purchase" },
        { id: "r-rc-7", type: "tag", enabled: true },
      ],
      cards: [
        {
          id: "rc-c-4",
          contactName: "Renata Vasconcelos",
          subtitle: "Pedido finalizado após lembrete",
          valueCents: 64000,
          channel: "web",
          intent: "intencao_de_compra",
          ownerId: "ia",
          enteredAt: hoursAgo(3),
          tags: ["Recuperado"],
          automation: "completed",
          automationDetail: "Conversão devolvida (CAPI)",
        },
      ],
    },
    {
      id: "rc-perdido",
      name: "Não recuperado",
      type: "lost",
      accent: { kind: "tone", tone: "destructive" },
      wipLimit: 0,
      triggers: [],
      robots: [{ id: "r-rc-8", type: "tag", enabled: true }],
      cards: [
        {
          id: "rc-c-5",
          contactName: "Felipe Barros",
          subtitle: "Sem resposta após 3 lembretes",
          valueCents: 28000,
          channel: "whatsapp",
          intent: "duvida",
          ownerId: "ia",
          enteredAt: daysAgo(4),
          tags: ["Frio"],
          automation: "idle",
        },
      ],
    },
  ],
}

export const PIPELINES: Pipeline[] = [vendas, atendimento, recuperacao]
