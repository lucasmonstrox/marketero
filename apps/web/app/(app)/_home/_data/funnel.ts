import type { StageType } from "@/shared/domain/taxonomy"

/**
 * Resumo do funil de vendas (Vendas) p/ o mini-pipeline da Visão geral. Espelha
 * os estágios do board em /funil: Novo → Contatado → Qualificado → Proposta →
 * Ganho. `count` alimenta a barra de progresso (proporção sobre o topo do funil).
 */

export interface FunnelStage {
  id: string
  label: string
  type: StageType
  count: number
}

export const FUNNEL_STAGES: FunnelStage[] = [
  { id: "novo", label: "Novo", type: "new", count: 128 },
  { id: "contatado", label: "Contatado", type: "active", count: 86 },
  { id: "qualificado", label: "Qualificado", type: "active", count: 54 },
  { id: "proposta", label: "Proposta", type: "active", count: 31 },
  { id: "ganho", label: "Ganho", type: "won", count: 19 },
]

/** Receita ganha no período (centavos) — exibida no rodapé do card. */
export const FUNNEL_WON_CENTS = 4_820_000
