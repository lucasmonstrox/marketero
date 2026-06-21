"use client"

import * as React from "react"
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { CHANNEL_META } from "@/shared/domain/channels"
import { ChannelIcon } from "@/shared/ui/channel-icon"
import { formatCompact, formatCurrency } from "@/shared/lib/format"

import { CHANNEL_BREAKDOWN } from "../_data/channel-breakdown"

/**
 * Volume por canal em barras horizontais. Aqui a cor do canal é CATEGORIA
 * legítima (métricas compara canais entre si), então cada barra usa
 * var(--color-channel-*) via CHANNEL_META — não a escala var(--chart-*). A
 * legenda usa ChannelIcon p/ não depender só de cor (WCAG AA).
 */

type Metric = "leads" | "conversas" | "receitaCents"

const METRIC_LABEL: Record<Metric, string> = {
  leads: "Leads",
  conversas: "Conversas",
  receitaCents: "Receita",
}

const chartConfig = {
  value: { label: "Volume" },
} satisfies ChartConfig

function formatValue(metric: Metric, value: number) {
  return metric === "receitaCents" ? formatCurrency(value) : formatCompact(value)
}

export function ChannelBreakdown() {
  const [metric, setMetric] = React.useState<Metric>("leads")

  const rows = React.useMemo(
    () =>
      [...CHANNEL_BREAKDOWN]
        .map((row) => ({
          channel: row.channel,
          label: CHANNEL_META[row.channel].label,
          value: row[metric],
        }))
        .sort((a, b) => b.value - a.value),
    [metric]
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Distribuição de {METRIC_LABEL[metric].toLowerCase()} por canal
        </p>
        <Select
          value={metric}
          onValueChange={(v) => setMetric(v as Metric)}
        >
          <SelectTrigger size="sm" className="w-[130px]" aria-label="Métrica do canal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="leads">Leads</SelectItem>
            <SelectItem value="conversas">Conversas</SelectItem>
            <SelectItem value="receitaCents">Receita</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[220px] w-full"
        role="img"
        aria-label={`${METRIC_LABEL[metric]} por canal no período`}
      >
        <BarChart
          accessibilityLayer
          data={rows}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={92}
            tickMargin={4}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(_label, payload) =>
                  (payload?.[0]?.payload as { label?: string })?.label ?? ""
                }
                formatter={(value) => (
                  <span className="font-mono font-medium tabular-nums">
                    {formatValue(metric, value as number)}
                  </span>
                )}
              />
            }
          />
          <Bar dataKey="value" radius={4} barSize={20} isAnimationActive={false}>
            {rows.map((row) => (
              <Cell
                key={row.channel}
                fill={`var(--channel-${row.channel})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {rows.map((row) => (
          <li key={row.channel} className="flex items-center gap-1.5">
            <ChannelIcon channel={row.channel} className="size-3.5" />
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium tabular-nums">
              {formatValue(metric, row.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
