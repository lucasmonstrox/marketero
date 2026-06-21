import Link from "next/link"
import { CircleCheckIcon, CircleDotIcon, SettingsIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

import { ChannelIcon } from "@/shared/ui/channel-icon"
import { CHANNEL_META } from "@/shared/domain/channels"
import { TONE_BADGE } from "@/shared/domain/taxonomy"

import {
  CHANNEL_CONNECTIONS,
  CONNECTION_STATUS_META,
} from "../_data/channels-status"

/**
 * "Canais conectados" — lista com ícone do canal, métrica de contexto e chip de
 * status. Status pareia ícone + rótulo (nunca cor isolada) e usa a escala
 * semântica de tons.
 */
export function ChannelsStatus() {
  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm">Canais conectados</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/configuracoes">
            Gerenciar
            <SettingsIcon data-icon="inline-end" aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {CHANNEL_CONNECTIONS.map((conn) => {
          const meta = CONNECTION_STATUS_META[conn.status]
          const StatusIcon =
            conn.status === "connected" ? CircleCheckIcon : CircleDotIcon
          return (
            <div
              key={conn.channel}
              className="flex items-center gap-3 rounded-lg px-1 py-1.5"
            >
              <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
                <ChannelIcon channel={conn.channel} className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm font-medium">
                  {CHANNEL_META[conn.channel].label}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {conn.meta}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn("gap-1 font-medium", TONE_BADGE[meta.tone])}
              >
                <StatusIcon className="size-3" aria-hidden />
                {meta.label}
              </Badge>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
