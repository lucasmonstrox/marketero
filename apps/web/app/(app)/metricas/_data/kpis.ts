import type { LucideIcon } from "lucide-react"
import {
  BotIcon,
  ClockIcon,
  TargetIcon,
  TrendingUpIcon,
  UserPlusIcon,
} from "lucide-react"

/**
 * KPIs do topo da página de Métricas (design-system §7.6 / visao-geral.md §5).
 * Cada métrica traz o valor já formatado, o delta vs. período anterior (como
 * fração p/ formatPercent) e uma série curta p/ a sparkline. `good` indica se
 * o delta é positivo do ponto de vista do negócio — speed-to-lead caindo é bom.
 */

export type DeltaDirection = "up" | "down"

export interface KpiData {
  id: string
  label: string
  /** Valor já formatado p/ exibição (R$, %, tempo, número). */
  value: string
  icon: LucideIcon
  /** Variação vs. período anterior, como fração (0.124 = +12,4%). */
  delta: number
  /** Direção visual da seta. */
  direction: DeltaDirection
  /** Se a direção representa um resultado bom (verde) ou ruim (vermelho). */
  good: boolean
  /** Texto curto do comparativo (ex.: "vs. período anterior"). */
  hint: string
  /** Série p/ a sparkline (ordem cronológica). */
  series: number[]
  /** Marca o KPI que vem do GraphRAG (recebe AiTag). */
  ai?: boolean
}

export const KPIS: KpiData[] = [
  {
    id: "receita",
    label: "Receita",
    value: "R$ 187,4 mil",
    icon: TrendingUpIcon,
    delta: 0.142,
    direction: "up",
    good: true,
    hint: "vs. período anterior",
    series: [18.2, 21.4, 19.8, 24.1, 26.7, 28.3, 31.2, 33.9],
  },
  {
    id: "novos-leads",
    label: "Novos leads",
    value: "1.284",
    icon: UserPlusIcon,
    delta: 0.196,
    direction: "up",
    good: true,
    hint: "vs. período anterior",
    series: [98, 112, 104, 131, 142, 158, 167, 172],
  },
  {
    id: "conversao",
    label: "Taxa de conversão",
    value: "26,8%",
    icon: TargetIcon,
    delta: 0.034,
    direction: "up",
    good: true,
    hint: "vs. período anterior",
    series: [22.1, 23.0, 22.6, 24.3, 25.1, 25.8, 26.4, 26.8],
  },
  {
    id: "speed-to-lead",
    label: "Tempo até 1ª resposta",
    value: "3m 48s",
    icon: ClockIcon,
    delta: 0.229,
    direction: "down",
    good: true,
    hint: "speed-to-lead vs. anterior",
    series: [8.4, 7.6, 6.9, 6.1, 5.4, 4.8, 4.2, 3.8],
  },
  {
    id: "ia-automatizada",
    label: "Conversas atendidas pela IA",
    value: "72%",
    icon: BotIcon,
    delta: 0.081,
    direction: "up",
    good: true,
    hint: "do total automatizado",
    series: [58, 61, 63, 66, 68, 69, 71, 72],
    ai: true,
  },
]
