import { PlugIcon, RefreshCwIcon, UnplugIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { ChannelIcon } from "@/shared/ui/channel-icon"
import { CHANNEL_META } from "@/shared/domain/channels"
import { formatRelative } from "@/shared/lib/format"

import {
  CHANNEL_CONNECTIONS,
  CONNECTION_STATUS_META,
  META_LEAD_ACCESS,
  type ChannelConnection,
} from "../_data/settings"
import { MetaLeadAccessCard } from "./meta-lead-access-card"
import { StatusBadge } from "./status-badge"

/**
 * Canais conectados (design-system §5.2 / §7.1). Uma linha por canal com o
 * acento da marca do canal na borda lateral, conta/página, status (TONE_BADGE),
 * última sincronização e a ação contextual. Facebook e Instagram trazem a saúde
 * do Lead Access da Meta logo abaixo (leads-crm.md §5).
 */
export function ChannelsSettings() {
  return (
    <div className="space-y-3">
      {CHANNEL_CONNECTIONS.map((conn) => (
        <ChannelRow key={conn.channel} conn={conn} />
      ))}
    </div>
  )
}

function ChannelRow({ conn }: { conn: ChannelConnection }) {
  const meta = CHANNEL_META[conn.channel]
  const status = CONNECTION_STATUS_META[conn.status]
  const leadAccess = META_LEAD_ACCESS.find((m) => m.channel === conn.channel)

  return (
    <div className="bg-card relative overflow-hidden rounded-lg border">
      <span
        className={cn("absolute inset-y-0 left-0 w-0.5", meta.bg)}
        aria-hidden
      />
      <div className="flex flex-col gap-3 p-3 pl-3.5 sm:flex-row sm:items-center">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md",
            meta.soft
          )}
        >
          <ChannelIcon channel={conn.channel} className="size-4.5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{meta.label}</p>
            <StatusBadge tone={status.tone} label={status.label} />
          </div>
          <p className="text-muted-foreground truncate text-xs">
            {conn.account}
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <span className="text-muted-foreground hidden text-xs whitespace-nowrap sm:inline">
            {conn.lastSyncAt
              ? `Sincronizado ${formatRelative(conn.lastSyncAt)}`
              : "Nunca sincronizado"}
          </span>
          <ChannelAction conn={conn} />
        </div>
      </div>

      {leadAccess ? (
        <div className="px-3 pb-3">
          <MetaLeadAccessCard health={leadAccess} />
        </div>
      ) : null}
    </div>
  )
}

function ChannelAction({ conn }: { conn: ChannelConnection }) {
  if (conn.status === "connected") {
    return (
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm">
          <RefreshCwIcon aria-hidden />
          Reconectar
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Desconectar ${CHANNEL_META[conn.channel].label}`}
        >
          <UnplugIcon aria-hidden />
        </Button>
      </div>
    )
  }

  return (
    <Button size="sm">
      <PlugIcon aria-hidden />
      {conn.status === "pending" ? "Concluir conexão" : "Conectar"}
    </Button>
  )
}
