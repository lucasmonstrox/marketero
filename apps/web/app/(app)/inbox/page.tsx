"use client"

import * as React from "react"
import { InboxIcon, SearchIcon } from "lucide-react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { ChannelIcon } from "@/shared/ui/channel-icon"
import {
  type Channel,
  CHANNEL_META,
  MVP_CHANNELS,
} from "@/shared/domain/channels"

import {
  CONVERSATIONS,
  DEFAULT_CONVERSATION_ID,
  TENANT_NAME,
} from "./_data/conversations"
import {
  ConversationList,
  type InboxFilter,
} from "./_components/conversation-list"
import { ConversationPanel } from "./_components/conversation-panel"
import { ContactContextPanel } from "./_components/contact-context-panel"
import { EmptyConversation } from "./_components/empty-conversation"

type ChannelFilter = Channel | "all"

export default function InboxPage() {
  const [selectedId, setSelectedId] = React.useState<string | null>(
    DEFAULT_CONVERSATION_ID
  )
  const [filter, setFilter] = React.useState<InboxFilter>("todas")
  const [channelFilter, setChannelFilter] = React.useState<ChannelFilter>("all")
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return CONVERSATIONS.filter((conversation) => {
      if (filter === "nao_lidas" && !conversation.unread) return false
      if (filter === "mencoes" && conversation.source !== "comment") return false
      if (channelFilter !== "all" && conversation.channel !== channelFilter) {
        return false
      }
      if (normalizedQuery.length > 0) {
        const haystack = `${conversation.contact.name} ${conversation.messages
          .map((m) => m.body)
          .join(" ")}`.toLowerCase()
        if (!haystack.includes(normalizedQuery)) return false
      }
      return true
    })
  }, [filter, channelFilter, query])

  const unreadCount = React.useMemo(
    () => CONVERSATIONS.filter((c) => c.unread).length,
    []
  )

  const selectedConversation = React.useMemo(
    () => filtered.find((c) => c.id === selectedId) ?? null,
    [filtered, selectedId]
  )

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        {/* Thin toolbar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <InboxIcon className="size-4 text-muted-foreground" aria-hidden />
            <h1 className="text-sm font-semibold text-foreground">Inbox</h1>
            <Badge variant="secondary" className="h-5 gap-1 tabular-nums">
              {unreadCount} não lidas
            </Badge>
          </div>

          <span className="hidden text-xs text-muted-foreground sm:inline">
            {TENANT_NAME}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar conversas…"
                aria-label="Buscar conversas"
                className="h-8 w-44 pl-8 lg:w-64"
              />
            </div>

            <Select
              value={channelFilter}
              onValueChange={(value) =>
                setChannelFilter(value as ChannelFilter)
              }
            >
              <SelectTrigger
                size="sm"
                className="w-40"
                aria-label="Filtrar por canal"
              >
                <SelectValue placeholder="Todos os canais" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">Todos os canais</SelectItem>
                {MVP_CHANNELS.map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    <ChannelIcon channel={channel} className="size-3.5" />
                    {CHANNEL_META[channel].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 3-panel workspace */}
        <ResizablePanelGroup
          orientation="horizontal"
          className="min-h-0 flex-1"
        >
          <ResizablePanel defaultSize="26%" minSize="20%" maxSize="36%">
            <ConversationList
              conversations={filtered}
              selectedId={selectedId}
              onSelect={setSelectedId}
              filter={filter}
              onFilterChange={setFilter}
              unreadCount={unreadCount}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="48%" minSize="30%">
            {selectedConversation ? (
              <ConversationPanel
                key={selectedConversation.id}
                conversation={selectedConversation}
              />
            ) : (
              <EmptyConversation />
            )}
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="26%" minSize="20%" maxSize="34%">
            {selectedConversation ? (
              <ContactContextPanel contact={selectedConversation.contact} />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
                O contexto do contato aparece aqui ao selecionar uma conversa.
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </TooltipProvider>
  )
}
