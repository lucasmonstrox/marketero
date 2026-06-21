"use client"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { cn } from "@workspace/ui/lib/utils"

import { AiTag } from "@/shared/ui/ai-tag"
import {
  confidenceBand,
  CONFIDENCE_BAND_META,
  TONE_BADGE,
} from "@/shared/domain/taxonomy"
import { formatPercent, formatTime } from "@/shared/lib/format"

import { type Message, initials } from "../_data/conversations"

interface MessageBubbleProps {
  message: Message
  contactName: string
}

/**
 * Bolha de mensagem do thread (design-system §7.2). Distingue três autores:
 * - contato → bolha neutra (bg-muted) alinhada à esquerda;
 * - humano (operadora) → bolha de marca (bg-primary) alinhada à direita;
 * - IA/GraphRAG (AIReply) → bolha com accent de IA (bg-ai/10 + border-ai-border)
 *   à direita, com AiTag e faixa de confiança. A cor nunca é o único sinal: há
 *   rótulo de autor e ícone.
 */
export function MessageBubble({ message, contactName }: MessageBubbleProps) {
  const isContact = message.author === "contact"
  const isAi = message.author === "ai"
  const isHuman = message.author === "human"

  const band = isAi ? confidenceBand(message.confidence ?? 0) : null
  const bandMeta = band ? CONFIDENCE_BAND_META[band] : null

  return (
    <div
      className={cn(
        "flex gap-2.5",
        isContact ? "flex-row" : "flex-row-reverse"
      )}
    >
      <Avatar size="sm" className="mt-0.5">
        <AvatarFallback
          className={cn(
            "text-[10px] font-medium",
            isAi && "bg-ai/15 text-ai",
            isHuman && "bg-primary/15 text-primary"
          )}
        >
          {isContact ? initials(contactName) : isAi ? "IA" : "AS"}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "flex max-w-[78%] flex-col gap-1",
          isContact ? "items-start" : "items-end"
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-foreground">
            {isContact ? contactName : isAi ? "Agente GraphRAG" : message.agentName}
          </span>
          {isAi ? <AiTag>IA</AiTag> : null}
          <time
            className="text-[11px] text-muted-foreground"
            dateTime={message.at}
          >
            {formatTime(message.at)}
          </time>
        </div>

        <div
          className={cn(
            "rounded-xl border px-3 py-2 text-sm leading-relaxed",
            isContact &&
              "rounded-tl-sm border-border bg-muted text-foreground",
            isHuman &&
              "rounded-tr-sm border-primary/20 bg-primary text-primary-foreground",
            isAi &&
              "border-ai-border bg-ai/10 text-foreground rounded-tr-sm"
          )}
        >
          {message.body}
        </div>

        {isAi && bandMeta ? (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                TONE_BADGE[bandMeta.tone]
              )}
            >
              {bandMeta.label}
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              Confiança {formatPercent(message.confidence ?? 0)} · resposta automática
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
