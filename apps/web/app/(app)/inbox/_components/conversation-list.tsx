"use client"

import { InboxIcon } from "lucide-react"

import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Badge } from "@workspace/ui/components/badge"

import { type Conversation } from "../_data/conversations"
import { ConversationListItem } from "./conversation-list-item"

export type InboxFilter = "todas" | "nao_lidas" | "mencoes"

const FILTER_LABELS: Record<InboxFilter, string> = {
  todas: "Todas",
  nao_lidas: "Não lidas",
  mencoes: "Menções",
}

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  filter: InboxFilter
  onFilterChange: (filter: InboxFilter) => void
  unreadCount: number
}

/**
 * Painel 1 (≈26%): filtros por aba + lista rolável de conversas. Cada filtro
 * mostra o contador correspondente para dar contexto operacional.
 */
export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  unreadCount,
}: ConversationListProps) {
  const mentionsCount = conversations.filter(
    (c) => c.source === "comment"
  ).length

  const counts: Record<InboxFilter, number> = {
    todas: conversations.length,
    nao_lidas: unreadCount,
    mencoes: mentionsCount,
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border px-2 py-2">
        <Tabs
          value={filter}
          onValueChange={(value) => onFilterChange(value as InboxFilter)}
        >
          <TabsList className="w-full">
            {(Object.keys(FILTER_LABELS) as InboxFilter[]).map((key) => (
              <TabsTrigger key={key} value={key} className="gap-1.5">
                {FILTER_LABELS[key]}
                <Badge
                  variant="secondary"
                  className="h-4 min-w-4 px-1 text-[10px] tabular-nums"
                >
                  {counts[key]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <InboxIcon className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              Nenhuma conversa aqui
            </p>
            <p className="text-xs text-muted-foreground">
              Ajuste o filtro para ver outras conversas do inbox.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <ConversationListItem
                  conversation={conversation}
                  selected={conversation.id === selectedId}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  )
}
