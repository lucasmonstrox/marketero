"use client"

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts"
import { ArrowDownIcon } from "lucide-react"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { cn } from "@workspace/ui/lib/utils"

import { formatNumber, formatPercent } from "@/shared/lib/format"

import { FUNNEL_STEPS } from "../_data/funnel"

/**
 * Funil de vendas (Novo → Ganho) em barras horizontais decrescentes. Mostra a
 * contagem por etapa e, abaixo, a conversão step-a-step (count[i]/count[i-1]).
 * Barras usam var(--chart-1) com opacidade decrescente p/ leitura de funil;
 * nunca dependem só de cor — cada etapa traz rótulo + número.
 */

const chartConfig = {
  count: { label: "Leads", color: "var(--chart-1)" },
} satisfies ChartConfig

const STEP_OPACITY = [1, 0.84, 0.68, 0.52, 0.38]

export function FunnelChart() {
  const top = FUNNEL_STEPS[0]?.count ?? 1
  const data = FUNNEL_STEPS.map((step, i) => ({
    ...step,
    fillOpacity: STEP_OPACITY[i] ?? 0.3,
    /** Conversão a partir da etapa anterior (a 1ª é o topo = 100%). */
    fromPrev: i === 0 ? 1 : step.count / (FUNNEL_STEPS[i - 1]?.count ?? step.count),
    /** Conversão acumulada vs. topo do funil. */
    fromTop: step.count / top,
  }))

  return (
    <div className="flex flex-col gap-4">
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[220px] w-full"
        role="img"
        aria-label="Funil de vendas do novo lead ao negócio ganho"
      >
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 56, bottom: 0, left: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={84}
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
                    {formatNumber(value as number)} leads
                  </span>
                )}
              />
            }
          />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={4}
            barSize={26}
            isAnimationActive={false}
          >
            {data.map((step) => (
              <Cell
                key={step.id}
                fill="var(--color-count)"
                fillOpacity={step.fillOpacity}
              />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              className="fill-foreground text-xs tabular-nums"
              formatter={(value) => formatNumber(Number(value))}
            />
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* Conversão entre etapas — números explícitos, sem depender de cor */}
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.slice(1).map((step, i) => {
          const isWin = step.type === "won"
          return (
            <li
              key={step.id}
              className="bg-muted/40 flex flex-col gap-0.5 rounded-lg border p-2"
            >
              <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <ArrowDownIcon className="size-3" aria-hidden />
                {data[i]?.label} → {step.label}
              </span>
              <span
                className={cn(
                  "text-base font-semibold tabular-nums",
                  isWin && "text-success"
                )}
              >
                {formatPercent(step.fromPrev, 0)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
