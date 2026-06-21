"use client"

import Link from "next/link"
import {
  ArrowUpRightIcon,
  MailIcon,
  MegaphoneIcon,
  PackageIcon,
  PhoneIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  TagIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"

import { AiTag } from "@/shared/ui/ai-tag"
import { ChannelIcon } from "@/shared/ui/channel-icon"
import { TONE_BADGE } from "@/shared/domain/taxonomy"
import { CHANNEL_META } from "@/shared/domain/channels"
import { formatCurrency, formatDate } from "@/shared/lib/format"

import { type Contact, initials } from "../_data/conversations"

interface ContactContextPanelProps {
  contact: Contact
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
      <Icon className="size-3.5" />
      {children}
    </h3>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-2.5 py-2">
      <span className="text-base font-semibold text-foreground tabular-nums">
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}

/**
 * Painel 3 (≈26%): dossiê do contato montado a partir do grafo de conhecimento
 * (design-system §7.2). Identidade + contato (E.164/email), tags, histórico
 * (leads/pedidos/valor), produtos sugeridos pelo grafo, campanha de origem e
 * consentimento LGPD.
 */
export function ContactContextPanel({ contact }: ContactContextPanelProps) {
  const { history, consent, campaign } = contact
  const campaignMeta = CHANNEL_META[campaign.channel]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
        <AiTag>Grafo de conhecimento</AiTag>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-3">
          {/* Identidade */}
          <div className="flex flex-col items-center gap-2 text-center">
            <Avatar size="lg">
              <AvatarFallback className="text-sm font-medium">
                {initials(contact.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {contact.name}
              </p>
              <p className="text-xs text-muted-foreground">{contact.location}</p>
            </div>
            {contact.tags.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-1">
                {contact.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="gap-1 text-[10px]"
                  >
                    <TagIcon className="size-2.5" aria-hidden />
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          {/* Contato */}
          <div className="flex flex-col gap-1.5">
            <a
              href={`tel:${contact.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/60"
            >
              <PhoneIcon
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="truncate tabular-nums">{contact.phone}</span>
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/60"
            >
              <MailIcon
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="truncate">{contact.email}</span>
            </a>
          </div>

          <Separator />

          {/* Histórico */}
          <div className="flex flex-col gap-2">
            <SectionTitle icon={TrendingUpIcon}>Histórico no grafo</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Leads" value={String(history.leads)} />
              <Stat label="Pedidos" value={String(history.orders)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat
                label="Total comprado"
                value={formatCurrency(history.totalSpentCents)}
              />
              <Stat
                label="Ticket médio"
                value={
                  history.avgTicketCents > 0
                    ? formatCurrency(history.avgTicketCents)
                    : "—"
                }
              />
            </div>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <UsersIcon className="size-3" aria-hidden />
              Primeiro contato em {formatDate(history.firstSeenAt)}
            </p>
          </div>

          <Separator />

          {/* Produtos sugeridos pelo grafo */}
          <div className="flex flex-col gap-2">
            <SectionTitle icon={PackageIcon}>
              Produtos sugeridos pelo grafo
            </SectionTitle>
            {contact.graphProducts.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {contact.graphProducts.map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5"
                  >
                    <span className="min-w-0 truncate text-xs text-foreground">
                      {product.name}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-foreground tabular-nums">
                      {formatCurrency(product.priceCents)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sem recomendações para este contato.
              </p>
            )}
          </div>

          <Separator />

          {/* Campanha de origem */}
          <div className="flex flex-col gap-2">
            <SectionTitle icon={MegaphoneIcon}>Campanha de origem</SectionTitle>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2">
              <ChannelIcon channel={campaign.channel} className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                {campaign.name}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {campaignMeta.label}
              </span>
            </div>
          </div>

          {/* Consentimento LGPD */}
          <div className="flex flex-col gap-2">
            <SectionTitle icon={ShieldCheckIcon}>Consentimento (LGPD)</SectionTitle>
            <div
              className={cn(
                "flex flex-col gap-1 rounded-lg border px-2.5 py-2",
                consent.optIn
                  ? TONE_BADGE.success
                  : TONE_BADGE.warning
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <ShieldCheckIcon className="size-3.5" aria-hidden />
                {consent.optIn ? "Opt-in confirmado" : "Sem opt-in de mensagens"}
              </span>
              <span className="text-[11px] opacity-90">{consent.basis}</span>
              <span className="text-[11px] opacity-75">
                {consent.optIn ? "Desde" : "Registrado em"}{" "}
                {formatDate(consent.at)}
              </span>
            </div>
          </div>

          <Separator />

          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/funil">
              Ver no funil
              <ArrowUpRightIcon aria-hidden />
            </Link>
          </Button>
        </div>
      </ScrollArea>
    </div>
  )
}
