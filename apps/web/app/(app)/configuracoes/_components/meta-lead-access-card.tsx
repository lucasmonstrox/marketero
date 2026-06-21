import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { ChannelIcon } from "@/shared/ui/channel-icon"

import {
  type CheckState,
  type MetaLeadAccessHealth,
} from "../_data/settings"

/**
 * Saúde do Lead Access da Meta por página (leads-crm.md §5): as checagens da
 * cadeia que precisam estar TODAS verdes para um lead chegar — App Review
 * (leads_retrieval), lead access concedido e webhook leadgen assinado. Cada
 * item mostra ícone + rótulo + dica; o ícone NUNCA é o único sinal (há texto e
 * aria-label de estado).
 */

const CHECK_META: Record<
  CheckState,
  { label: string; icon: typeof CheckCircle2Icon; className: string }
> = {
  ok: { label: "OK", icon: CheckCircle2Icon, className: "text-success" },
  pending: {
    label: "Pendente",
    icon: ClockIcon,
    className: "text-warning-foreground",
  },
  error: {
    label: "Falha",
    icon: AlertTriangleIcon,
    className: "text-destructive",
  },
}

export function MetaLeadAccessCard({
  health,
}: {
  health: MetaLeadAccessHealth
}) {
  const allOk = health.checks.every((c) => c.state === "ok")

  return (
    <div className="bg-muted/40 rounded-lg border p-3">
      <div className="mb-2.5 flex items-center gap-2">
        <ChannelIcon channel={health.channel} className="size-3.5" />
        <span className="text-xs font-medium">Lead Access · {health.account}</span>
        <span
          className={cn(
            "ml-auto text-xs font-medium",
            allOk ? "text-success" : "text-warning-foreground"
          )}
        >
          {allOk ? "Pronto para receber leads" : "Ação necessária"}
        </span>
      </div>
      <ul className="space-y-1.5">
        {health.checks.map((check) => {
          const meta = CHECK_META[check.state]
          const Icon = meta.icon
          return (
            <li key={check.id} className="flex items-start gap-2">
              <Icon
                className={cn("mt-0.5 size-3.5 shrink-0", meta.className)}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs leading-tight font-medium">
                  {check.label}
                  <span className="sr-only"> — {meta.label}</span>
                </p>
                <p className="text-muted-foreground text-[11px] leading-tight">
                  {check.hint}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
