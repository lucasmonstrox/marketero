"use client"

import {
  CornerDownLeftIcon,
  GitBranchIcon,
  PackageIcon,
  PencilIcon,
  ShoppingBagIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card"
import { cn } from "@workspace/ui/lib/utils"

import { AiTag } from "@/shared/ui/ai-tag"
import {
  confidenceBand,
  CONFIDENCE_BAND_META,
  TONE_BADGE,
} from "@/shared/domain/taxonomy"
import { formatCurrency, formatPercent } from "@/shared/lib/format"

import { type SuggestedReply } from "../_data/conversations"

interface SuggestedReplyCardProps {
  suggestion: SuggestedReply
  onAction: (action: string) => void
}

/**
 * Sugestão de resposta gerada pelo GraphRAG, pendente de revisão humana
 * (design-system §7.2). Tratamento --ai em toda a superfície, faixa de
 * confiança (confidenceBand/CONFIDENCE_BAND_META), fontes do grafo e ações:
 * Responder / Editar / Ignorar / Sugerir produto / Escalar.
 */
export function SuggestedReplyCard({
  suggestion,
  onAction,
}: SuggestedReplyCardProps) {
  const band = confidenceBand(suggestion.confidence)
  const bandMeta = CONFIDENCE_BAND_META[band]

  return (
    <section
      aria-label="Sugestão de resposta da IA"
      className="border-ai-border bg-ai/5 rounded-xl border p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AiTag>Sugestão GraphRAG</AiTag>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
              TONE_BADGE[bandMeta.tone]
            )}
          >
            {bandMeta.label}
          </span>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
          {formatPercent(suggestion.confidence)} de confiança
        </span>
      </div>

      <p className="text-foreground mt-2.5 rounded-lg bg-card/60 p-2.5 text-sm leading-relaxed ring-1 ring-ai-border/40">
        {suggestion.body}
      </p>

      <div className="mt-2.5 flex items-start gap-1.5">
        <GitBranchIcon
          className="text-ai mt-0.5 size-3.5 shrink-0"
          aria-hidden
        />
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Fontes do grafo: </span>
          {suggestion.sources.join(" · ")}
        </p>
      </div>

      {suggestion.suggestedProducts.length > 0 ? (
        <div className="mt-2.5 flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">
            Produtos sugeridos para anexar
          </span>
          <ul className="flex flex-col gap-1">
            {suggestion.suggestedProducts.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2 py-1.5"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <PackageIcon
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="truncate text-xs text-foreground">
                    {product.name}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium text-foreground tabular-nums">
                  {formatCurrency(product.priceCents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Separator className="my-2.5" />

      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" onClick={() => onAction("responder")}>
          <CornerDownLeftIcon aria-hidden />
          Responder
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAction("editar")}
        >
          <PencilIcon aria-hidden />
          Editar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAction("sugerir_produto")}
        >
          <ShoppingBagIcon aria-hidden />
          Sugerir produto
        </Button>
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction("escalar")}
            >
              <UserPlusIcon aria-hidden />
              Escalar
            </Button>
          </HoverCardTrigger>
          <HoverCardContent align="start" className="w-56">
            <p className="text-xs text-muted-foreground">
              Transfere a conversa para um atendente humano e pausa a automação
              do agente nesta thread.
            </p>
          </HoverCardContent>
        </HoverCard>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-muted-foreground"
          onClick={() => onAction("ignorar")}
        >
          <XIcon aria-hidden />
          Ignorar
        </Button>
      </div>
    </section>
  )
}
