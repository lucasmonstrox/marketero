"use client"

import { type Conversation } from "../_data/conversations"
import { MessageBubble } from "./message-bubble"
import { SuggestedReplyCard } from "./suggested-reply-card"

interface MessageThreadProps {
  conversation: Conversation
  onSuggestionAction: (action: string) => void
}

/**
 * Corpo rolável da conversa: bolhas (humano/contato/IA) em ordem cronológica e,
 * ao final, a sugestão pendente do GraphRAG quando houver.
 */
export function MessageThread({
  conversation,
  onSuggestionAction,
}: MessageThreadProps) {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-center">
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
          Início da conversa
        </span>
      </div>

      {conversation.messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          contactName={conversation.contact.name}
        />
      ))}

      {conversation.suggestedReply ? (
        <SuggestedReplyCard
          suggestion={conversation.suggestedReply}
          onAction={onSuggestionAction}
        />
      ) : null}
    </div>
  )
}
