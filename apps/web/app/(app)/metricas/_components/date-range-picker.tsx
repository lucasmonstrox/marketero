"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { CalendarIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"

/**
 * Seletor de período (Popover + Calendar mode="range") com locale pt-BR. O
 * rótulo do botão resume o intervalo escolhido (`dd MMM` → `dd MMM`). Estado
 * só de UI — alimentaria o filtro de período da página numa app real.
 */

function formatRange(range: DateRange | undefined) {
  if (!range?.from) return "Selecionar período"
  if (!range.to) return format(range.from, "dd MMM yyyy", { locale: ptBR })
  return `${format(range.from, "dd MMM", { locale: ptBR })} – ${format(
    range.to,
    "dd MMM yyyy",
    { locale: ptBR }
  )}`
}

export function DateRangePicker() {
  // Período padrão: últimos ~56 dias (mundo "recente" da Bella Decor).
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(2026, 3, 26),
    to: new Date(2026, 5, 21),
  })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="font-normal">
          <CalendarIcon className="text-muted-foreground" aria-hidden />
          {formatRange(range)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          locale={ptBR}
          numberOfMonths={2}
          defaultMonth={range?.from}
          selected={range}
          onSelect={setRange}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
