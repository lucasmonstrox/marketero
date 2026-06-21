"use client"

import * as React from "react"
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { formatRelative } from "@/shared/lib/format"

import {
  CONNECTION_STATUS_META,
  WEBHOOKS,
  type WebhookConfig,
} from "../_data/settings"
import { StatusBadge } from "./status-badge"

/**
 * Webhooks / API: endpoint, verify token mascarado (revelável) e status por
 * integração. Token mostrado mascarado por padrão — o operador revela/copia sob
 * demanda.
 */
export function WebhooksSettings() {
  return (
    <div className="space-y-3">
      {WEBHOOKS.map((hook) => (
        <WebhookRow key={hook.id} hook={hook} />
      ))}
    </div>
  )
}

function WebhookRow({ hook }: { hook: WebhookConfig }) {
  const [revealed, setRevealed] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const status = CONNECTION_STATUS_META[hook.status]

  function copyEndpoint() {
    navigator.clipboard?.writeText(hook.endpoint)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="bg-muted/40 space-y-2.5 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">{hook.label}</p>
        <StatusBadge tone={status.tone} label={status.label} />
        <span className="text-muted-foreground ml-auto text-xs">
          {hook.lastEventAt
            ? `Último evento ${formatRelative(hook.lastEventAt)}`
            : "Sem eventos"}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Endpoint">
          <code className="bg-background flex-1 truncate rounded-md border px-2 py-1 font-mono text-xs">
            {hook.endpoint}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={copyEndpoint}
            aria-label={`Copiar endpoint de ${hook.label}`}
          >
            {copied ? (
              <CheckIcon className="text-success" aria-hidden />
            ) : (
              <CopyIcon aria-hidden />
            )}
          </Button>
        </Field>

        <Field label="Verify token">
          <code className="bg-background flex-1 truncate rounded-md border px-2 py-1 font-mono text-xs">
            {revealed ? "mk_lg_8d41a0c6f23f9a" : hook.verifyTokenMasked}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setRevealed((v) => !v)}
            aria-label={
              revealed ? "Ocultar verify token" : "Revelar verify token"
            }
            aria-pressed={revealed}
          >
            {revealed ? (
              <EyeOffIcon aria-hidden />
            ) : (
              <EyeIcon aria-hidden />
            )}
          </Button>
        </Field>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <span className="text-muted-foreground text-[11px] font-medium">
        {label}
      </span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  )
}
