"use client"

import * as React from "react"

import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Progress } from "@workspace/ui/components/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"

import { formatDate, formatNumber, formatPercent } from "@/shared/lib/format"

import {
  LOCALE_OPTIONS,
  ORG,
  TIMEZONE_OPTIONS,
} from "../_data/settings"
import { StatusBadge } from "./status-badge"

/**
 * Organização / tenant: identidade fiscal (nome + CNPJ controlados), fuso e
 * idioma, e o plano com uso de cota do ciclo. As barras de uso são informativas;
 * o número exato é o sinal primário, a barra reforça.
 */
export function OrgSettings() {
  const [name, setName] = React.useState(ORG.name)
  const [cnpj, setCnpj] = React.useState(ORG.cnpj)
  const [timezone, setTimezone] = React.useState(ORG.timezone)
  const [locale, setLocale] = React.useState(ORG.locale)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="org-name">Nome da organização</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-cnpj">CNPJ</Label>
          <Input
            id="org-cnpj"
            value={cnpj}
            inputMode="numeric"
            onChange={(e) => setCnpj(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">{ORG.legalName}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-timezone">Fuso horário</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="org-timezone" className="w-full">
              <SelectValue placeholder="Selecione o fuso" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-locale">Idioma do produto</Label>
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger id="org-locale" className="w-full">
              <SelectValue placeholder="Selecione o idioma" />
            </SelectTrigger>
            <SelectContent>
              {LOCALE_OPTIONS.map((loc) => (
                <SelectItem key={loc.value} value={loc.value}>
                  {loc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Plano</span>
          <StatusBadge tone={ORG.planTone} label={ORG.plan} dot={false} />
          <span className="text-muted-foreground ml-auto text-xs">
            Renova em {formatDate(ORG.renewsAt)}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <UsageMeter
            label="Conversas com IA"
            used={ORG.usage.aiConversations.used}
            limit={ORG.usage.aiConversations.limit}
            suffix="no ciclo"
          />
          <UsageMeter
            label="Membros da equipe"
            used={ORG.usage.seats.used}
            limit={ORG.usage.seats.limit}
            suffix="assentos"
          />
          <UsageMeter
            label="Canais conectados"
            used={ORG.usage.channels.used}
            limit={ORG.usage.channels.limit}
            suffix="canais"
          />
        </div>
      </div>
    </div>
  )
}

function UsageMeter({
  label,
  used,
  limit,
  suffix,
}: {
  label: string
  used: number
  limit: number
  suffix: string
}) {
  const fraction = limit > 0 ? used / limit : 0
  return (
    <div className="bg-muted/40 space-y-1.5 rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-semibold tabular-nums">
        {formatNumber(used)}
        <span className="text-muted-foreground font-normal">
          {" / "}
          {formatNumber(limit)} {suffix}
        </span>
      </p>
      <Progress value={Math.min(100, fraction * 100)} />
      <p className="text-muted-foreground text-[11px]">
        {formatPercent(fraction)} utilizado
      </p>
    </div>
  )
}
