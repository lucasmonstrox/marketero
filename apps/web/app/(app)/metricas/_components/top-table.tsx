"use client"

import * as React from "react"
import { ArrowUpDownIcon } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

import { CHANNEL_META } from "@/shared/domain/channels"
import { ChannelIcon } from "@/shared/ui/channel-icon"
import { formatCurrency, formatNumber, formatPercent } from "@/shared/lib/format"

import { TOP_CAMPAIGNS, type CampaignRow } from "../_data/top-campaigns"

/**
 * "Top campanhas" — desempenho por campanha com ordenação client-side. Colunas
 * numéricas alinhadas à direita e tabulares; o canal entra como acento via
 * ChannelIcon + rótulo. Conversão e receita usam os formatadores pt-BR.
 */

type SortKey = "leads" | "conversao" | "receitaCents"

const NUMERIC_COLS: { key: SortKey; label: string }[] = [
  { key: "leads", label: "Leads" },
  { key: "conversao", label: "Conversão" },
  { key: "receitaCents", label: "Receita" },
]

export function TopTable() {
  const [sort, setSort] = React.useState<SortKey>("receitaCents")

  const rows = React.useMemo(
    () => [...TOP_CAMPAIGNS].sort((a, b) => b[sort] - a[sort]),
    [sort]
  )

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Campanha</TableHead>
          <TableHead>Canal</TableHead>
          {NUMERIC_COLS.map((col) => (
            <TableHead key={col.key} className="text-right">
              <button
                type="button"
                onClick={() => setSort(col.key)}
                aria-pressed={sort === col.key}
                className={cn(
                  "inline-flex items-center gap-1 hover:text-foreground",
                  sort === col.key ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {col.label}
                <ArrowUpDownIcon className="size-3" aria-hidden />
              </button>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row: CampaignRow) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.nome}</TableCell>
            <TableCell>
              <span className="flex items-center gap-1.5">
                <ChannelIcon channel={row.channel} className="size-3.5" />
                <span className="text-muted-foreground">
                  {CHANNEL_META[row.channel].label}
                </span>
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(row.leads)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPercent(row.conversao, 1)}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatCurrency(row.receitaCents)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
