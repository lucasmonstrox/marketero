import type { Channel } from "@/shared/domain/channels"
import type { SemanticTone } from "@/shared/domain/taxonomy"

/**
 * Mock das Campanhas da "Bella Decor" (agentes.md §8). A Campanha é o "bind":
 * amarra (Agente, Form, canal, audiência). O `formId` é um OVERRIDE — quando
 * `null`, a conversa usa o `defaultFormId` do agente. Daí "1 agente, N
 * campanhas com N forms".
 *
 * UI-only — dados fictícios colocados aqui de propósito.
 */

export type CampaignStatus = "active" | "draft" | "paused"

export const CAMPAIGN_STATUS_META: Record<
  CampaignStatus,
  { label: string; tone: SemanticTone }
> = {
  active: { label: "Ativa", tone: "success" },
  draft: { label: "Rascunho", tone: "muted" },
  paused: { label: "Pausada", tone: "warning" },
}

export interface CampaignMetrics {
  /** Leads captados (conversas que chegaram a `complete`). */
  leads: number
  /** Fração 0–1 de conversão (leads / conversas iniciadas). */
  conversion: number
  /** Custo por lead em CENTAVOS (padrão `value_cents` do schema). */
  costPerLead: number
}

export interface Campaign {
  id: string
  name: string
  agentId: string
  /** Override do Form — `null` usa o default do agente (agentes.md §8). */
  formId: string | null
  channel: Channel
  audience: string
  status: CampaignStatus
  metrics: CampaignMetrics
  startedAt: string
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: "camp-sob-medida-wpp",
    name: "Sob medida — Cozinhas planejadas",
    agentId: "agent-clara",
    formId: null,
    channel: "whatsapp",
    audience: "Remarketing — visitantes do site (30 dias)",
    status: "active",
    metrics: { leads: 342, conversion: 0.41, costPerLead: 1890 },
    startedAt: "2026-05-12T00:00:00",
  },
  {
    id: "camp-consultoria-ig",
    name: "Consultoria grátis — Salas de estar",
    agentId: "agent-rafa",
    formId: null,
    channel: "instagram",
    audience: "Lookalike 2% — compradores recentes",
    status: "active",
    metrics: { leads: 521, conversion: 0.38, costPerLead: 1450 },
    startedAt: "2026-05-28T00:00:00",
  },
  {
    id: "camp-saldao-fb",
    name: "Mega Saldão — Fim de coleção",
    agentId: "agent-bel",
    formId: null,
    channel: "facebook",
    audience: "Interesses — decoração e reforma",
    status: "active",
    metrics: { leads: 1208, conversion: 0.57, costPerLead: 640 },
    startedAt: "2026-06-02T00:00:00",
  },
  {
    id: "camp-clara-consultoria-ml",
    name: "Especialista no Mercado Livre",
    agentId: "agent-clara",
    formId: "form-consultoria",
    channel: "mercadolivre",
    audience: "Compradores da loja oficial",
    status: "active",
    metrics: { leads: 187, conversion: 0.33, costPerLead: 2150 },
    startedAt: "2026-06-08T00:00:00",
  },
  {
    id: "camp-natal-web",
    name: "Landing — Coleção de Natal",
    agentId: "agent-bel",
    formId: "form-natal-2025",
    channel: "web",
    audience: "Tráfego orgânico — blog de decoração",
    status: "paused",
    metrics: { leads: 96, conversion: 0.29, costPerLead: 980 },
    startedAt: "2025-11-15T00:00:00",
  },
  {
    id: "camp-pos-venda-wpp",
    name: "Pesquisa pós-entrega",
    agentId: "agent-rafa",
    formId: "form-pos-venda",
    channel: "whatsapp",
    audience: "Clientes com pedido entregue (7 dias)",
    status: "draft",
    metrics: { leads: 0, conversion: 0, costPerLead: 0 },
    startedAt: "2026-06-20T00:00:00",
  },
]

/** Conta quantas campanhas usam um Form (como override). */
export function countCampaignsUsingForm(formId: string): number {
  return CAMPAIGNS.filter((c) => c.formId === formId).length
}

/** Conta quantas campanhas usam um Agente. */
export function countCampaignsUsingAgent(agentId: string): number {
  return CAMPAIGNS.filter((c) => c.agentId === agentId).length
}
