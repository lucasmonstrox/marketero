import type { StageType } from "@/shared/domain/taxonomy"

/**
 * Funil de vendas end-to-end p/ o `FunnelChart` (Novo → Contatado →
 * Qualificado → Proposta → Ganho). `count` desenha a barra; a conversão entre
 * etapas é derivada no componente (count[i] / count[i-1]).
 */

export interface FunnelStep {
  id: string
  label: string
  type: StageType
  count: number
}

export const FUNNEL_STEPS: FunnelStep[] = [
  { id: "novo", label: "Novo", type: "new", count: 1284 },
  { id: "contatado", label: "Contatado", type: "active", count: 892 },
  { id: "qualificado", label: "Qualificado", type: "active", count: 487 },
  { id: "proposta", label: "Proposta", type: "active", count: 261 },
  { id: "ganho", label: "Ganho", type: "won", count: 138 },
]

/** Receita ganha no período (centavos). */
export const FUNNEL_WON_CENTS = 18_740_000
