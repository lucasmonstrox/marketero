"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

/**
 * Seletor de período do cockpit. UI-only: mantém o estado localmente. O default
 * é "Últimos 7 dias", coerente com os dados mockados da página.
 */
const PERIODS = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "14d", label: "Últimos 14 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
]

export function PeriodSelect() {
  const [period, setPeriod] = React.useState("7d")

  return (
    <Select value={period} onValueChange={setPeriod}>
      <SelectTrigger aria-label="Selecionar período" className="gap-1.5">
        <CalendarIcon className="text-muted-foreground size-4" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {PERIODS.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
