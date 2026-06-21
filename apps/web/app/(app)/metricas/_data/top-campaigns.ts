import type { Channel } from "@/shared/domain/channels"

/**
 * "Top campanhas" — tabela de desempenho por campanha (visao-geral.md §5). O
 * canal é o de origem dominante da campanha (acento via CHANNEL_META). Conversão
 * é fração (0–1) p/ formatPercent; receita em centavos p/ formatCurrency.
 */

export interface CampaignRow {
  id: string
  nome: string
  channel: Channel
  leads: number
  /** Conversão como fração (0–1). */
  conversao: number
  /** Receita atribuída (centavos). */
  receitaCents: number
}

export const TOP_CAMPAIGNS: CampaignRow[] = [
  {
    id: "colecao-primavera",
    nome: "Coleção Primavera 2026",
    channel: "instagram",
    leads: 342,
    conversao: 0.312,
    receitaCents: 5_240_000,
  },
  {
    id: "frete-gratis-sul",
    nome: "Frete grátis região Sul",
    channel: "mercadolivre",
    leads: 218,
    conversao: 0.284,
    receitaCents: 3_680_000,
  },
  {
    id: "remarketing-carrinho",
    nome: "Remarketing carrinho",
    channel: "whatsapp",
    leads: 196,
    conversao: 0.356,
    receitaCents: 4_120_000,
  },
  {
    id: "lancamento-tapetes",
    nome: "Lançamento linha tapetes",
    channel: "facebook",
    leads: 154,
    conversao: 0.221,
    receitaCents: 2_180_000,
  },
  {
    id: "blog-decor-inverno",
    nome: "Guia de decoração de inverno",
    channel: "web",
    leads: 88,
    conversao: 0.193,
    receitaCents: 1_460_000,
  },
]
