import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { AiTag } from "@/shared/ui/ai-tag"
import { ChannelIcon } from "@/shared/ui/channel-icon"
import { ClassificationBadge } from "@/shared/ui/classification-badge"
import { formatRelative } from "@/shared/lib/format"

import { ACTIVITY } from "../_data/activity"
import { LeadsChart } from "./leads-chart"

/**
 * "Atividade recente" — feed do modelo evento → classificação → ação, seguido
 * do gráfico de leads por canal. Coluna larga do grid principal.
 */
export function ActivityFeed() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 py-4">
          <div className="space-y-1">
            <CardTitle className="text-sm">Atividade recente</CardTitle>
            <CardDescription>
              Eventos, classificações e ações em todos os canais
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/inbox">
              Abrir inbox
              <ArrowRightIcon data-icon="inline-end" aria-hidden />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          <ul className="divide-border divide-y border-t">
            {ACTIVITY.map((item) => {
              const Icon = item.icon
              return (
                <li
                  key={item.id}
                  className="hover:bg-muted/40 flex items-start gap-3 px-4 py-3 transition-colors"
                >
                  <div className="bg-muted text-muted-foreground relative flex size-8 shrink-0 items-center justify-center rounded-full">
                    <Icon className="size-4" aria-hidden />
                    <span className="ring-card absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-card ring-2">
                      <ChannelIcon channel={item.channel} className="size-3" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-foreground text-sm font-medium">
                        {item.title}
                      </span>
                      {item.intent ? (
                        <ClassificationBadge intent={item.intent} />
                      ) : null}
                      {item.ai ? <AiTag /> : null}
                    </div>
                    <p className="text-muted-foreground mt-0.5 truncate text-sm">
                      {item.detail}
                    </p>
                  </div>
                  <time className="text-muted-foreground shrink-0 text-xs whitespace-nowrap tabular-nums">
                    {formatRelative(item.at)}
                  </time>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 py-4">
          <div className="space-y-1">
            <CardTitle className="text-sm">Leads por canal</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/metricas">
              Ver métricas
              <ArrowRightIcon data-icon="inline-end" aria-hidden />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="border-t px-2 pt-4 pb-2">
          <LeadsChart />
        </CardContent>
      </Card>
    </div>
  )
}
