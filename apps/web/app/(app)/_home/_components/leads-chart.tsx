"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"

import { CHANNEL_META } from "@/shared/domain/channels"

import {
  CHART_CHANNELS,
  LEADS_BY_CHANNEL,
} from "../_data/leads-by-channel"

/**
 * "Leads por canal (7 dias)" — barras empilhadas multi-série. Cada canal recebe
 * uma cor da escala de gráficos (var(--chart-*)); o rótulo vem de CHANNEL_META
 * p/ falar a mesma língua dos demais componentes.
 */
const SERIES_COLOR: Record<(typeof CHART_CHANNELS)[number], string> = {
  instagram: "var(--chart-1)",
  facebook: "var(--chart-2)",
  whatsapp: "var(--chart-3)",
  mercadolivre: "var(--chart-4)",
  web: "var(--chart-5)",
  tiktok: "var(--chart-2)",
  x: "var(--chart-4)",
}

const chartConfig = CHART_CHANNELS.reduce<ChartConfig>((acc, channel) => {
  acc[channel] = {
    label: CHANNEL_META[channel].label,
    color: SERIES_COLOR[channel],
  }
  return acc
}, {})

export function LeadsChart() {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[228px] w-full">
      <BarChart
        data={LEADS_BY_CHANNEL}
        margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="dia"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        {CHART_CHANNELS.map((channel, index) => (
          <Bar
            key={channel}
            dataKey={channel}
            stackId="leads"
            fill={`var(--color-${channel})`}
            radius={
              index === CHART_CHANNELS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
            }
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}
