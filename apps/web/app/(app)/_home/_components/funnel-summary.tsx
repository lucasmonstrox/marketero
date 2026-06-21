import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Progress } from "@workspace/ui/components/progress"
import { cn } from "@workspace/ui/lib/utils"

import { formatCurrency, formatNumber } from "@/shared/lib/format"

import { FUNNEL_STAGES, FUNNEL_WON_CENTS } from "../_data/funnel"

/**
 * Mini-funil de Vendas: estágios Novo → Ganho com contagem e barra de progresso
 * (proporção sobre o topo do funil). Estágio "Ganho" recebe acento de sucesso.
 */
export function FunnelSummary() {
  const top = FUNNEL_STAGES[0]?.count ?? 1

  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm">Funil de vendas</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/funil">
            Abrir funil
            <ArrowRightIcon data-icon="inline-end" aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {FUNNEL_STAGES.map((stage) => {
          const pct = Math.round((stage.count / top) * 100)
          const won = stage.type === "won"
          return (
            <div key={stage.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span
                  className={cn(
                    "font-medium",
                    won ? "text-success" : "text-foreground"
                  )}
                >
                  {stage.label}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {formatNumber(stage.count)}
                </span>
              </div>
              <Progress
                value={pct}
                aria-label={`${stage.label}: ${stage.count} leads`}
                className={cn(won && "[&_[data-slot=progress-indicator]]:bg-success")}
              />
            </div>
          )
        })}
        <div className="border-border text-muted-foreground flex items-center justify-between border-t pt-3 text-xs">
          <span>Receita ganha (7 dias)</span>
          <span className="text-success font-medium tabular-nums">
            {formatCurrency(FUNNEL_WON_CENTS)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
