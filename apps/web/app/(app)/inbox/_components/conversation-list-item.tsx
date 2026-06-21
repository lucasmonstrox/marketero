"use client"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { cn } from "@workspace/ui/lib/utils"

import { ChannelIcon } from "@/shared/ui/channel-icon"
import { ClassificationBadge } from "@/shared/ui/classification-badge"
import { CHANNEL_META } from "@/shared/domain/channels"
import { formatRelative } from "@/shared/lib/format"

import {
  type Conversation,
  initials,
  lastMessage,
} from "../_data/conversations"

interface ConversationListItemProps {
  conversation: Conversation
  selected: boolean
  onSelect: (id: string) => void
}

/**
 * Item da lista de conversas (design-system §7.2). Borda lateral de 4px com a
 * cor do canal (CHANNEL_META[c].border), avatar com iniciais, prévia da última
 * mensagem truncada, ícone do canal, tempo relativo, dot de não lida e o badge
 * de classificação de IA do último evento.
 */
export function ConversationListItem({
  conversation,
  selected,
  onSelect,
}: ConversationListItemProps) {
  const { contact, channel, intent, unread, source } = conversation
  const last = lastMessage(conversation)
  const channelMeta = CHANNEL_META[channel]

  const previewPrefix =
    last.author === "ai"
      ? "IA: "
      : last.author === "human"
        ? "Você: "
        : ""

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      aria-pressed={selected}
      aria-label={`Conversa com ${contact.name} no ${channelMeta.label}${
        unread ? ", não lida" : ""
      }`}
      className={cn(
        "flex w-full gap-3 border-l-4 px-3 py-2.5 text-left transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        channelMeta.border,
        selected
          ? "bg-accent"
          : "bg-transparent hover:bg-muted/60"
      )}
    >
      <div className="relative">
        <Avatar size="default">
          <AvatarFallback className="text-xs font-medium">
            {initials(contact.name)}
          </AvatarFallback>
        </Avatar>
        <span
          className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-background ring-1 ring-border"
          aria-hidden
        >
          <ChannelIcon channel={channel} className="size-2.5" />
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              unread ? "font-semibold text-foreground" : "font-medium text-foreground"
            )}
          >
            {contact.name}
          </span>
          <time
            className="shrink-0 text-[11px] text-muted-foreground"
            dateTime={last.at}
          >
            {formatRelative(last.at)}
          </time>
        </div>

        <p
          className={cn(
            "truncate text-xs",
            unread ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {previewPrefix}
          {last.body}
        </p>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">
            {source === "comment" ? "Comentário" : "Mensagem"}
          </span>
          {intent ? (
            <ClassificationBadge intent={intent} className="h-4 px-1.5 text-[10px]" />
          ) : null}
          {unread ? (
            <span
              className="ml-auto size-2 shrink-0 rounded-full bg-primary"
              aria-label="Não lida"
            />
          ) : null}
        </div>
      </div>
    </button>
  )
}
