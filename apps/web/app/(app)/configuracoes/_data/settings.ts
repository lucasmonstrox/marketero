import type { Channel } from "@/shared/domain/channels"
import type { SemanticTone } from "@/shared/domain/taxonomy"

/**
 * Mock das Configurações da tenant fictícia "Bella Decor" (operadora/admin Ana
 * Souza). UI-only — dados colocados. Modela canais conectados + saúde do Lead
 * Access da Meta (leads-crm.md §5), organização/plano, white-label dos forms
 * hospedados (design-system §6 — Eixo B), equipe, e os defaults de IA &
 * automação / escalation_policy (agentes.md §10). Cor de status vem sempre de um
 * tom semântico (TONE_BADGE), nunca hex cru — exceto as SWATCHES de marca do
 * white-label, que são VALORES de dados (presets de cor por tenant).
 */

/* ------------------------------ Canais ----------------------------------- */

export type ConnectionStatus = "connected" | "pending" | "disconnected"

/** Status de conexão → tom semântico do design system. */
export const CONNECTION_STATUS_META: Record<
  ConnectionStatus,
  { label: string; tone: SemanticTone }
> = {
  connected: { label: "Conectado", tone: "success" },
  pending: { label: "Pendente", tone: "warning" },
  disconnected: { label: "Desconectado", tone: "muted" },
}

export interface ChannelConnection {
  channel: Channel
  /** Nome da conta/página conectada (ou "—" quando não conectado). */
  account: string
  status: ConnectionStatus
  /** Última sincronização (ISO) — null quando nunca sincronizou. */
  lastSyncAt: string | null
}

export const CHANNEL_CONNECTIONS: ChannelConnection[] = [
  {
    channel: "instagram",
    account: "@belladecor",
    status: "connected",
    lastSyncAt: "2026-06-21T11:42:00-03:00",
  },
  {
    channel: "facebook",
    account: "Bella Decor Móveis & Decoração",
    status: "connected",
    lastSyncAt: "2026-06-21T11:40:00-03:00",
  },
  {
    channel: "whatsapp",
    account: "+55 11 98877-1234 · WhatsApp Business",
    status: "connected",
    lastSyncAt: "2026-06-21T11:55:00-03:00",
  },
  {
    channel: "mercadolivre",
    account: "BELLA DECOR OFICIAL",
    status: "pending",
    lastSyncAt: "2026-06-19T16:10:00-03:00",
  },
  {
    channel: "web",
    account: "loja.belladecor.com.br",
    status: "connected",
    lastSyncAt: "2026-06-21T09:05:00-03:00",
  },
]

/* ----------------------- Saúde do Lead Access (Meta) --------------------- */

/** Estado de cada checagem da cadeia de Lead Access (leads-crm.md §5). */
export type CheckState = "ok" | "pending" | "error"

export interface LeadAccessCheck {
  id: string
  label: string
  /** Detalhe curto exibido abaixo do rótulo. */
  hint: string
  state: CheckState
}

/**
 * Saúde do Lead Access por página Meta. As DUAS camadas independentes de
 * leads-crm.md §5 (App Review + lead access concedido) somadas ao nível-2 do
 * webhook leadgen (§3.1) — todas precisam estar OK para o lead chegar.
 */
export interface MetaLeadAccessHealth {
  /** Canal (facebook | instagram) ao qual a página/conta pertence. */
  channel: Extract<Channel, "facebook" | "instagram">
  /** Nome da página/conta. */
  account: string
  checks: LeadAccessCheck[]
}

export const META_LEAD_ACCESS: MetaLeadAccessHealth[] = [
  {
    channel: "facebook",
    account: "Bella Decor Móveis & Decoração",
    checks: [
      {
        id: "fb-app-review",
        label: "App aprovado (leads_retrieval)",
        hint: "Advanced Access + Business Verification concluídos",
        state: "ok",
      },
      {
        id: "fb-lead-access",
        label: "Lead Access concedido",
        hint: "System User com a task MANAGE_LEADS na página",
        state: "ok",
      },
      {
        id: "fb-webhook",
        label: "Webhook leadgen assinado",
        hint: "subscribed_apps inclui o field leadgen",
        state: "ok",
      },
    ],
  },
  {
    channel: "instagram",
    account: "@belladecor",
    checks: [
      {
        id: "ig-app-review",
        label: "App aprovado (leads_retrieval)",
        hint: "Advanced Access + Business Verification concluídos",
        state: "ok",
      },
      {
        id: "ig-lead-access",
        label: "Lead Access concedido",
        hint: "Conceda o acesso ao app no Leads Access Manager",
        state: "pending",
      },
      {
        id: "ig-webhook",
        label: "Webhook leadgen assinado",
        hint: "Reassine o field leadgen em subscribed_apps",
        state: "error",
      },
    ],
  },
]

/* ----------------------- Organização / Tenant ---------------------------- */

export type PlanTone = Extract<SemanticTone, "info" | "success">

export interface OrgSettings {
  name: string
  legalName: string
  cnpj: string
  timezone: string
  locale: string
  plan: string
  planTone: PlanTone
  /** Uso de cota do plano no ciclo atual. */
  usage: {
    /** Conversas com IA usadas / incluídas no ciclo. */
    aiConversations: { used: number; limit: number }
    /** Membros de equipe ativos / incluídos. */
    seats: { used: number; limit: number }
    /** Canais conectados / incluídos. */
    channels: { used: number; limit: number }
  }
  /** Renovação do ciclo (ISO). */
  renewsAt: string
}

export const ORG: OrgSettings = {
  name: "Bella Decor",
  legalName: "Bella Decor Comércio de Móveis Ltda.",
  cnpj: "34.512.880/0001-07",
  timezone: "America/Sao_Paulo",
  locale: "pt-BR",
  plan: "Crescimento",
  planTone: "info",
  usage: {
    aiConversations: { used: 3240, limit: 5000 },
    seats: { used: 4, limit: 8 },
    channels: { used: 5, limit: 10 },
  },
  renewsAt: "2026-07-01T00:00:00-03:00",
}

export const TIMEZONE_OPTIONS = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3) · São Paulo" },
  { value: "America/Manaus", label: "Amazonas (GMT-4) · Manaus" },
  { value: "America/Rio_Branco", label: "Acre (GMT-5) · Rio Branco" },
  { value: "America/Noronha", label: "Fernando de Noronha (GMT-2)" },
]

export const LOCALE_OPTIONS = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "es-AR", label: "Español (Argentina)" },
  { value: "en-US", label: "English (US)" },
]

/* ----------------------------- White-label ------------------------------- */

/**
 * Presets de cor da marca do tenant para os forms/landing hospedados (Eixo B,
 * design-system §6). Os valores HEX abaixo são DADOS (a marca do cliente), não
 * o chrome do produto — por isso é permitido literais de cor aqui. O componente
 * de preview aplica a cor via `style`, não via classe Tailwind.
 */
export interface BrandPreset {
  id: string
  label: string
  /** Cor da marca (valor de dados do tenant). */
  hex: string
}

export const BRAND_PRESETS: BrandPreset[] = [
  { id: "terracota", label: "Terracota", hex: "#C2643B" },
  { id: "indigo", label: "Índigo", hex: "#4F46E5" },
  { id: "esmeralda", label: "Esmeralda", hex: "#0F9D7A" },
  { id: "vinho", label: "Vinho", hex: "#9B1C4B" },
  { id: "grafite", label: "Grafite", hex: "#374151" },
  { id: "ambar", label: "Âmbar", hex: "#D97706" },
]

export const BRAND_FONT_OPTIONS = [
  { value: "inter", label: "Inter" },
  { value: "geist", label: "Geist" },
  { value: "poppins", label: "Poppins" },
  { value: "playfair", label: "Playfair Display" },
  { value: "lora", label: "Lora" },
]

export type DnsStatus = "verified" | "pending" | "error"

export const DNS_STATUS_META: Record<
  DnsStatus,
  { label: string; tone: SemanticTone }
> = {
  verified: { label: "Verificado", tone: "success" },
  pending: { label: "Aguardando DNS", tone: "warning" },
  error: { label: "Falha no DNS", tone: "destructive" },
}

export interface CustomDomain {
  host: string
  status: DnsStatus
  /** Registro CNAME esperado (alvo). */
  cnameTarget: string
}

export const CUSTOM_DOMAIN: CustomDomain = {
  host: "formularios.belladecor.com.br",
  status: "pending",
  cnameTarget: "hosted.marketero.app",
}

/** Estado inicial dos controles de white-label (controlados na UI). */
export const WHITE_LABEL_DEFAULTS = {
  presetId: "terracota",
  radius: 12,
  fontValue: "inter",
}

/* -------------------------------- Equipe --------------------------------- */

export type TeamRole = "admin" | "operador" | "vendedor"

export const TEAM_ROLE_META: Record<
  TeamRole,
  { label: string; hint: string; tone: SemanticTone }
> = {
  admin: {
    label: "Admin",
    hint: "Acesso total + cobrança e configurações",
    tone: "info",
  },
  operador: {
    label: "Operador",
    hint: "Inbox, funil e automações",
    tone: "muted",
  },
  vendedor: {
    label: "Vendedor",
    hint: "Acesso aos próprios leads do funil",
    tone: "muted",
  },
}

export interface TeamMemberSettings {
  id: string
  name: string
  email: string
  initials: string
  role: TeamRole
  status: "active" | "invited"
  lastSeenAt: string | null
}

export const TEAM_MEMBERS: TeamMemberSettings[] = [
  {
    id: "ana",
    name: "Ana Souza",
    email: "ana@belladecor.com.br",
    initials: "AS",
    role: "admin",
    status: "active",
    lastSeenAt: "2026-06-21T11:58:00-03:00",
  },
  {
    id: "bruno",
    name: "Bruno Carvalho",
    email: "bruno@belladecor.com.br",
    initials: "BC",
    role: "operador",
    status: "active",
    lastSeenAt: "2026-06-21T10:30:00-03:00",
  },
  {
    id: "carla",
    name: "Carla Nunes",
    email: "carla@belladecor.com.br",
    initials: "CN",
    role: "vendedor",
    status: "active",
    lastSeenAt: "2026-06-20T17:45:00-03:00",
  },
  {
    id: "diego",
    name: "Diego Ramos",
    email: "diego@belladecor.com.br",
    initials: "DR",
    role: "vendedor",
    status: "invited",
    lastSeenAt: null,
  },
]

/* --------------------------- IA & Automação ------------------------------ */

/** Default do modelo do Agente (id de AGENT_MODELS). */
export const DEFAULT_AGENT_MODEL = "claude-sonnet-4-6"

/**
 * Cortes default das faixas de confiança (kanban.md). Valores em % inteiro para
 * casar com os sliders. auto ≥ 80 · review 50–79 · ignore < 50.
 */
export const CONFIDENCE_DEFAULTS = {
  auto: 80,
  review: 50,
}

/**
 * Defaults de escalation_policy por agente (agentes.md §10). Limiares numéricos
 * + gatilhos imediatos que pulam a retomada e vão direto a humano.
 */
export const ESCALATION_DEFAULTS = {
  maxDigressions: 3,
  maxValidationRetries: 2,
  /** Janela de abandono (sem resposta → grava lead parcial). */
  abandonAfter: "24h",
  reengageBeforeAbandon: true,
  triggers: {
    explicitHumanRequest: true,
    outOfScope: true,
    negativeSentiment: false,
  },
}

export const ABANDON_AFTER_OPTIONS = [
  { value: "6h", label: "6 horas" },
  { value: "12h", label: "12 horas" },
  { value: "24h", label: "24 horas" },
  { value: "48h", label: "48 horas" },
  { value: "72h", label: "72 horas" },
]

export interface EscalationTrigger {
  id: keyof typeof ESCALATION_DEFAULTS.triggers
  label: string
  hint: string
}

export const ESCALATION_TRIGGERS: EscalationTrigger[] = [
  {
    id: "explicitHumanRequest",
    label: "Pedido explícito de humano",
    hint: "Usuário pede para falar com um atendente",
  },
  {
    id: "outOfScope",
    label: "Tópico fora de escopo",
    hint: "Assunto que o agente não cobre",
  },
  {
    id: "negativeSentiment",
    label: "Sentimento negativo",
    hint: "Escalar só em sinais fortes para não derrubar conversas saudáveis",
  },
]

/* ----------------------------- Webhooks / API ---------------------------- */

export interface WebhookConfig {
  id: string
  label: string
  endpoint: string
  /** Verify token mascarado para exibição. */
  verifyTokenMasked: string
  status: ConnectionStatus
  lastEventAt: string | null
}

export const WEBHOOKS: WebhookConfig[] = [
  {
    id: "meta-leadgen",
    label: "Meta · leadgen",
    endpoint: "https://api.marketero.app/webhooks/meta/leadgen",
    verifyTokenMasked: "mk_lg_••••••••••3f9a",
    status: "connected",
    lastEventAt: "2026-06-21T11:39:00-03:00",
  },
  {
    id: "whatsapp-cloud",
    label: "WhatsApp Cloud API",
    endpoint: "https://api.marketero.app/webhooks/whatsapp",
    verifyTokenMasked: "mk_wa_••••••••••b21c",
    status: "connected",
    lastEventAt: "2026-06-21T11:54:00-03:00",
  },
  {
    id: "mercadolivre",
    label: "Mercado Livre · notifications",
    endpoint: "https://api.marketero.app/webhooks/mercadolivre",
    verifyTokenMasked: "mk_ml_••••••••••7e08",
    status: "pending",
    lastEventAt: null,
  },
]
