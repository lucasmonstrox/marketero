import type { LucideIcon } from "lucide-react"
import {
  ClockIcon,
  MessagesSquareIcon,
  TargetIcon,
  TrendingUpIcon,
  UserPlusIcon,
} from "lucide-react"

/**
 * KPIs do cockpit (Visão geral §7.6). Cada métrica traz o valor formatado, o
 * delta vs. período anterior (já como fração, p/ formatPercent) e uma série
 * curta p/ a sparkline. `tone` indica se o delta é positivo do ponto de vista
 * do negócio (ex.: speed-to-lead caindo é bom → up).
 */

export type DeltaDirection = "up" | "down"

export interface MetricCardData {
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
  /** Texto curto do comparativo (ex.: "vs. 7 dias anteriores"). */
  hint: string
  /** Série p/ a sparkline (ordem cronológica). */
  series: number[]
}

export const METRICS: MetricCardData[] = [
  {
    id: "novos-leads",
    label: "Novos leads",
    value: "342",
    icon: UserPlusIcon,
    delta: 0.182,
    direction: "up",
    good: true,
    hint: "vs. 7 dias anteriores",
    series: [28, 34, 31, 45, 42, 58, 61, 64],
  },
  {
    id: "conversas-ativas",
    label: "Conversas ativas",
    value: "87",
    icon: MessagesSquareIcon,
    delta: 0.064,
    direction: "up",
    good: true,
    hint: "vs. 7 dias anteriores",
    series: [62, 70, 68, 74, 79, 81, 84, 87],
  },
  {
    id: "taxa-conversao",
    label: "Taxa de conversão",
    value: "24,3%",
    icon: TargetIcon,
    delta: 0.031,
    direction: "up",
    good: true,
    hint: "vs. 7 dias anteriores",
    series: [19.1, 20.4, 21.0, 20.6, 22.3, 23.1, 23.8, 24.3],
  },
  {
    id: "receita",
    label: "Receita",
    value: "R$ 48,2 mil",
    icon: TrendingUpIcon,
    delta: 0.127,
    direction: "up",
    good: true,
    hint: "vs. 7 dias anteriores",
    series: [3800, 4200, 5100, 4800, 6300, 7100, 8200, 8700],
  },
  {
    id: "speed-to-lead",
    label: "Tempo até 1ª resposta",
    value: "4m 12s",
    icon: ClockIcon,
    delta: 0.214,
    direction: "down",
    good: true,
    hint: "speed-to-lead vs. anterior",
    series: [9.2, 8.1, 7.4, 6.8, 6.1, 5.3, 4.7, 4.2],
  },
]
