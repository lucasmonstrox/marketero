"use client"

import { PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { PageContainer } from "@/shared/ui/page-container"
import { PageHeader } from "@/shared/ui/page-header"

import { ActivityFeed } from "./_home/_components/activity-feed"
import { AiSuggestions } from "./_home/_components/ai-suggestions"
import { ChannelsStatus } from "./_home/_components/channels-status"
import { FunnelSummary } from "./_home/_components/funnel-summary"
import { MetricCard } from "./_home/_components/metric-card"
import { PeriodSelect } from "./_home/_components/period-select"
import { METRICS } from "./_home/_data/metrics"

/**
 * Visão geral — cockpit consolidado de marketing + vendas + atendimento da
 * Bella Decor. Linha de KPIs no topo, grid principal com "Atividade recente"
 * (modelo evento → classificação → ação) à esquerda e coluna de IA/funil/canais
 * à direita. UI-only: dados mockados em `_home/_data`.
 */
export default function VisaoGeralPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Visão geral"
        description="Marketing, vendas e atendimento da Bella Decor em um só painel."
      >
        <PeriodSelect />
        <Button>
          <PlusIcon data-icon="inline-start" aria-hidden />
          Conectar canal
        </Button>
      </PageHeader>

      {/* Linha de KPIs */}
      <section
        aria-label="Indicadores do período"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        {METRICS.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      {/* Grid principal */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
        <aside aria-label="IA, funil e canais" className="flex flex-col gap-4">
          <AiSuggestions />
          <FunnelSummary />
          <ChannelsStatus />
        </aside>
      </div>
    </PageContainer>
  )
}
