import Link from "next/link"
import { ArrowRightIcon, SparklesIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { ChannelIcon } from "@/shared/ui/channel-icon"
import { confidenceBand, CONFIDENCE_BAND_META } from "@/shared/domain/taxonomy"
import { formatPercent } from "@/shared/lib/format"

import { AI_SUGGESTIONS } from "../_data/ai-suggestions"

/**
 * "Sugestões da IA" — saídas do GraphRAG com tratamento de acento de IA
 * (border-ai-border / bg-ai/10). Cada card mostra contexto, racional, confiança
 * e o botão de ação primária.
 */
export function AiSuggestions() {
  return (
    <Card className="border-ai-border bg-ai/5 gap-3">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <span className="bg-ai/10 text-ai flex size-7 shrink-0 items-center justify-center rounded-md">
          <SparklesIcon className="size-4" aria-hidden />
        </span>
        <div className="space-y-0.5">
          <CardTitle className="text-ai text-sm">Sugestões da IA</CardTitle>
          <p className="text-muted-foreground text-xs">
            Recomendações do cérebro GraphRAG
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {AI_SUGGESTIONS.map((s) => {
          const Icon = s.icon
          const band = CONFIDENCE_BAND_META[confidenceBand(s.confidence)]
          return (
            <div
              key={s.id}
              className="border-ai-border/60 bg-card rounded-lg border p-3"
            >
              <div className="flex items-start gap-2.5">
                <span className="bg-ai/10 text-ai flex size-7 shrink-0 items-center justify-center rounded-md">
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm leading-snug font-medium">
                    {s.title}
                  </p>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                    <ChannelIcon channel={s.channel} className="size-3" />
                    <span className="truncate">{s.context}</span>
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                {s.rationale}
              </p>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="text-ai inline-flex items-center gap-1 text-[11px] font-medium tabular-nums">
                  <SparklesIcon className="size-3" aria-hidden />
                  {formatPercent(s.confidence)} · {band.label}
                </span>
                <Button
                  size="xs"
                  className="bg-ai text-ai-foreground hover:bg-ai/90"
                >
                  {s.action}
                </Button>
              </div>
            </div>
          )
        })}
        <Button asChild variant="ghost" size="sm" className="text-ai w-full">
          <Link href="/inbox">
            Ver todas as sugestões
            <ArrowRightIcon data-icon="inline-end" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
