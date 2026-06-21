"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRightIcon,
  DownloadIcon,
  LayersIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { type ChartConfig } from "@workspace/ui/components/chart"

import { CHANNEL_META, MVP_CHANNELS } from "@/shared/domain/channels"
import { AiTag } from "@/shared/ui/ai-tag"
import { ChannelIcon } from "@/shared/ui/channel-icon"
import { PageContainer } from "@/shared/ui/page-container"
import { PageHeader } from "@/shared/ui/page-header"

import { ChannelBreakdown } from "./_components/channel-breakdown"
import { DateRangePicker } from "./_components/date-range-picker"
import { EngagementHeatmap } from "./_components/engagement-heatmap"
import { FunnelChart } from "./_components/funnel-chart"
import { MetricCard } from "./_components/metric-card"
import { TimeSeriesChart } from "./_components/time-series-chart"
import { TopTable } from "./_components/top-table"
import { KPIS } from "./_data/kpis"
import {
  TIME_SERIES_ATENDIMENTO,
  TIME_SERIES_GERAL,
  TIME_SERIES_SOCIAL,
  TIME_SERIES_VENDAS,
  type TimeSeriesPoint,
} from "./_data/time-series"

/**
 * Métricas — visão unificada de social, atendimento e vendas (design-system
 * §7.6 / visao-geral.md §5). Página-documento (PageContainer): linha de KPIs +
 * abas com gráficos via shadcn ChartContainer (recharts). UI-only, mock pt-BR
 * do tenant fictício "Bella Decor".
 */

const tsConfig = {
  leads: { label: "Leads", color: "var(--chart-1)" },
  conversas: { label: "Conversas", color: "var(--chart-2)" },
  vendas: { label: "Vendas", color: "var(--chart-3)" },
} satisfies ChartConfig

/** Config por aba: dados + rótulos de cada série (cor sempre var(--chart-*)). */
const TABS: Record<
  string,
  { data: TimeSeriesPoint[]; config: ChartConfig; chartTitle: string }
> = {
  geral: {
    data: TIME_SERIES_GERAL,
    config: tsConfig,
    chartTitle: "Leads, conversas e vendas por semana",
  },
  social: {
    data: TIME_SERIES_SOCIAL,
    config: {
      leads: { label: "Leads de conteúdo", color: "var(--chart-1)" },
      conversas: { label: "Interações", color: "var(--chart-2)" },
      vendas: { label: "Vendas sociais", color: "var(--chart-3)" },
    },
    chartTitle: "Desempenho de social por semana",
  },
  atendimento: {
    data: TIME_SERIES_ATENDIMENTO,
    config: {
      leads: { label: "Conversas", color: "var(--chart-1)" },
      conversas: { label: "Resolvidas pela IA", color: "var(--chart-2)" },
      vendas: { label: "Escaladas", color: "var(--chart-3)" },
    },
    chartTitle: "Volume de atendimento por semana",
  },
  vendas: {
    data: TIME_SERIES_VENDAS,
    config: {
      leads: { label: "Receita (mil R$)", color: "var(--chart-1)" },
      conversas: { label: "Ticket médio (R$)", color: "var(--chart-2)" },
      vendas: { label: "Negócios ganhos", color: "var(--chart-3)" },
    },
    chartTitle: "Receita e negócios por semana",
  },
}

export default function MetricasPage() {
  const [channel, setChannel] = React.useState<string>("todos")

  return (
    <PageContainer>
      <PageHeader
        title="Métricas"
        description="Visão unificada de social, atendimento e vendas."
      >
        <DateRangePicker />
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger size="sm" className="w-[150px]" aria-label="Filtrar por canal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os canais</SelectItem>
            {MVP_CHANNELS.map((c) => (
              <SelectItem key={c} value={c}>
                <ChannelIcon channel={c} className="size-3.5" />
                {CHANNEL_META[c].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline">
          <DownloadIcon aria-hidden />
          Exportar
        </Button>
      </PageHeader>

      {/* Linha de KPIs */}
      <section aria-label="Indicadores-chave do período">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {KPIS.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </section>

      {/* Abas de seções */}
      <Tabs defaultValue="geral" className="gap-4">
        <TabsList>
          <TabsTrigger value="geral">Visão geral</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="atendimento">Atendimento</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
        </TabsList>

        {Object.entries(TABS).map(([key, tab]) => (
          <TabsContent key={key} value={key} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Série temporal — ocupa 2 colunas */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>{tab.chartTitle}</CardTitle>
                  <CardDescription>
                    Evolução nas últimas 8 semanas, séries empilhadas.
                  </CardDescription>
                  <CardAction>
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/campanhas">
                        Campanhas
                        <ArrowRightIcon aria-hidden />
                      </Link>
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <TimeSeriesChart data={tab.data} config={tab.config} />
                </CardContent>
              </Card>

              {/* Volume por canal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5">
                    <LayersIcon className="size-4" aria-hidden />
                    Volume por canal
                  </CardTitle>
                  <CardDescription>
                    Comparativo entre os canais ativos.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChannelBreakdown />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Funil de vendas */}
              <Card>
                <CardHeader>
                  <CardTitle>Funil de vendas</CardTitle>
                  <CardDescription>
                    Do novo lead ao negócio ganho, com conversão entre etapas.
                  </CardDescription>
                  <CardAction>
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/funil">
                        Abrir funil
                        <ArrowRightIcon aria-hidden />
                      </Link>
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <FunnelChart />
                </CardContent>
              </Card>

              {/* Horário de engajamento */}
              <Card>
                <CardHeader>
                  <CardTitle>Horário de engajamento</CardTitle>
                  <CardDescription>
                    Intensidade de conversas por dia e faixa horária.
                  </CardDescription>
                  <CardAction>
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/inbox">
                        Ir ao inbox
                        <ArrowRightIcon aria-hidden />
                      </Link>
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <EngagementHeatmap />
                </CardContent>
              </Card>
            </div>

            {/* Top campanhas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Top campanhas
                  <AiTag>Ranqueado por IA</AiTag>
                </CardTitle>
                <CardDescription>
                  Campanhas com melhor desempenho no período selecionado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TopTable />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </PageContainer>
  )
}
