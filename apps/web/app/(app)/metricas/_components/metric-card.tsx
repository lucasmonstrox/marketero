"use client"

import { Area, AreaChart } from "recharts"
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  ChartContainer,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { cn } from "@workspace/ui/lib/utils"

import { AiTag } from "@/shared/ui/ai-tag"
import { formatPercent } from "@/shared/lib/format"

import type { KpiData } from "../_data/kpis"

const sparkConfig = {
  v: { label: "Valor", color: "var(--chart-1)" },
} satisfies ChartConfig

/**
 * Card de KPI: rótulo + valor grande, delta vs. período anterior (seta + tom
 * semântico) e mini-sparkline. O tom do delta segue `good` (resultado bom =
 * verde), não a direção da seta — speed-to-lead caindo é positivo. KPIs de IA
 * recebem AiTag p/ marcar a origem GraphRAG.
 */
export function MetricCard({ metric }: { metric: KpiData }) {
  const Icon = metric.icon
  const DeltaIcon =
    metric.direction === "up" ? ArrowUpRightIcon : ArrowDownRightIcon
  const data = metric.series.map((v, i) => ({ i, v }))

  return (
    <Card size="sm" className="gap-3">
      <CardHeader>
        <CardTitle className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
          <Icon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{metric.label}</span>
          {metric.ai ? <AiTag className="ml-auto">IA</AiTag> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-2">
        <div className="space-y-1.5">
          <div className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
            {metric.value}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium tabular-nums",
                metric.good ? "text-success" : "text-destructive"
              )}
            >
              <DeltaIcon className="size-3.5" aria-hidden />
              {formatPercent(metric.delta, 1)}
            </span>
            <span className="text-muted-foreground truncate">{metric.hint}</span>
          </div>
        </div>
        <ChartContainer
          config={sparkConfig}
          className="aspect-auto h-12 w-24 shrink-0"
        >
          <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient
                id={`spark-${metric.id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              dataKey="v"
              type="monotone"
              stroke="var(--chart-1)"
              strokeWidth={1.5}
              fill={`url(#spark-${metric.id})`}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
