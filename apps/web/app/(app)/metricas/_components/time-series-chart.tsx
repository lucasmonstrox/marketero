"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"

import { formatCompact } from "@/shared/lib/format"

import type { TimeSeriesPoint } from "../_data/time-series"

/**
 * Série temporal multi-métrica (Leads · Conversas · Vendas) em área empilhada
 * suave. Cada série usa uma cor da escala var(--chart-*) via ChartConfig; o
 * `config` controlado de fora permite que cada aba renomeie os rótulos sem
 * recriar o componente.
 */

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[]
  config: ChartConfig
}

export function TimeSeriesChart({ data, config }: TimeSeriesChartProps) {
  const keys = Object.keys(config)

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-[280px] w-full"
      role="img"
      aria-label="Evolução semanal de leads, conversas e vendas no período"
    >
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <defs>
          {keys.map((key) => (
            <linearGradient
              key={key}
              id={`ts-fill-${key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={`var(--color-${key})`}
                stopOpacity={0.35}
              />
              <stop
                offset="95%"
                stopColor={`var(--color-${key})`}
                stopOpacity={0.04}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="semana" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          tickMargin={4}
          tickFormatter={(value: number) => formatCompact(value)}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        {keys.map((key) => (
          <Area
            key={key}
            dataKey={key}
            type="monotone"
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            fill={`url(#ts-fill-${key})`}
            stackId="ts"
            isAnimationActive={false}
            dot={false}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  )
}
