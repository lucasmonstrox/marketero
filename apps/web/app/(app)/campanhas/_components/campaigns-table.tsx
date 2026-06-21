import { BotIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { ChannelIcon } from "@/shared/ui/channel-icon"
import { CHANNEL_META } from "@/shared/domain/channels"
import { formatCurrency, formatNumber, formatPercent } from "@/shared/lib/format"

import { getAgent } from "../_data/agents"
import { CAMPAIGN_STATUS_META, CAMPAIGNS } from "../_data/campaigns"
import { getForm } from "../_data/forms"
import { StatusBadge } from "./status-badge"

/**
 * Tabela de Campanhas — o "bind" de cada uma: agente vinculado, Form (override
 * ou default herdado do agente), canal, audiência, status e métricas de
 * captação. Densa (text-sm), com tooltips para o detalhe do form.
 */
export function CampaignsTable() {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Campanha</TableHead>
            <TableHead>Agente</TableHead>
            <TableHead>Form</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">Conversão</TableHead>
            <TableHead className="text-right">Custo/lead</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {CAMPAIGNS.map((campaign) => {
            const agent = getAgent(campaign.agentId)
            const isOverride = campaign.formId !== null
            const resolvedFormId = campaign.formId ?? agent?.defaultFormId
            const form = resolvedFormId ? getForm(resolvedFormId) : undefined
            const channelMeta = CHANNEL_META[campaign.channel]
            const statusMeta = CAMPAIGN_STATUS_META[campaign.status]

            return (
              <TableRow key={campaign.id}>
                <TableCell className="max-w-[15rem]">
                  <p className="truncate font-medium">{campaign.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {campaign.audience}
                  </p>
                </TableCell>

                <TableCell>
                  <span className="inline-flex items-center gap-1.5">
                    <BotIcon
                      className="text-muted-foreground size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{agent?.name ?? "—"}</span>
                  </span>
                </TableCell>

                <TableCell>
                  <Tooltip>
                    <TooltipTrigger className="inline-flex items-center gap-1.5 text-left">
                      <span className="max-w-[12rem] truncate">
                        {form?.name ?? "—"}
                      </span>
                      <Badge
                        variant={isOverride ? "secondary" : "outline"}
                        className="text-[10px]"
                      >
                        {isOverride ? "override" : "default"}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isOverride
                        ? "Form específico desta campanha (override)"
                        : `Form padrão do agente ${agent?.name ?? ""}`}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>

                <TableCell>
                  <span className="inline-flex items-center gap-1.5">
                    <ChannelIcon channel={campaign.channel} />
                    <span className="text-muted-foreground text-xs">
                      {channelMeta.label}
                    </span>
                  </span>
                </TableCell>

                <TableCell className="text-right tabular-nums">
                  {formatNumber(campaign.metrics.leads)}
                </TableCell>

                <TableCell className="text-right tabular-nums">
                  {campaign.status === "draft"
                    ? "—"
                    : formatPercent(campaign.metrics.conversion)}
                </TableCell>

                <TableCell className="text-muted-foreground text-right tabular-nums">
                  {campaign.status === "draft"
                    ? "—"
                    : formatCurrency(campaign.metrics.costPerLead)}
                </TableCell>

                <TableCell>
                  <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
