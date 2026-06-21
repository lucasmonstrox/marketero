"use client"

import * as React from "react"
import {
  CheckCheckIcon,
  CheckIcon,
  MoreHorizontalIcon,
  SendIcon,
  SparklesIcon,
  UserPlusIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Separator } from "@workspace/ui/components/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { cn } from "@workspace/ui/lib/utils"

import { AiTag } from "@/shared/ui/ai-tag"
import { ChannelIcon } from "@/shared/ui/channel-icon"
import { ClassificationBadge } from "@/shared/ui/classification-badge"
import { CHANNEL_META } from "@/shared/domain/channels"

import { type Conversation, initials } from "../_data/conversations"
import { MessageThread } from "./message-thread"

const STATUS_LABEL: Record<Conversation["status"], string> = {
  aberta: "Aberta",
  aguardando_cliente: "Aguardando cliente",
  resolvida: "Resolvida",
}

interface ConversationPanelProps {
  conversation: Conversation
}

/**
 * Painel 2 (flex-1): header com identidade do contato + ações (Escalar /
 * Marcar resolvido via dropdown), thread rolável e composer com Textarea,
 * botão Enviar e "Gerar com IA".
 */
export function ConversationPanel({ conversation }: ConversationPanelProps) {
  const [draft, setDraft] = React.useState("")
  const { contact, channel, intent, status, resolved } = conversation
  const channelMeta = CHANNEL_META[channel]

  function handleSuggestionAction(action: string) {
    if (action === "responder" && conversation.suggestedReply) {
      setDraft(conversation.suggestedReply.body)
    }
    if (action === "editar" && conversation.suggestedReply) {
      setDraft(conversation.suggestedReply.body)
    }
  }

  function handleGenerate() {
    setDraft(
      "Olá! Obrigada pela mensagem 💜 Sou da Bella Decor e já estou verificando isso para você. Posso ajudar com mais alguma coisa enquanto isso?"
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
        <Avatar size="default">
          <AvatarFallback className="text-xs font-medium">
            {initials(contact.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {contact.name}
            </h2>
            <ChannelIcon channel={channel} className="size-3.5 shrink-0" />
            {intent ? <ClassificationBadge intent={intent} /> : null}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{channelMeta.label}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  status === "resolvida"
                    ? "bg-success"
                    : status === "aguardando_cliente"
                      ? "bg-warning"
                      : "bg-info"
                )}
                aria-hidden
              />
              {STATUS_LABEL[status]}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" variant="outline">
            <UserPlusIcon aria-hidden />
            Escalar p/ humano
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Mais ações da conversa"
              >
                <MoreHorizontalIcon aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem disabled={resolved}>
                <CheckCheckIcon aria-hidden />
                Marcar como resolvido
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CheckIcon aria-hidden />
                Marcar como não lida
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <SparklesIcon aria-hidden />
                Reclassificar com IA
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive">
                <UserPlusIcon aria-hidden />
                Atribuir a outro atendente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Thread */}
      <ScrollArea className="min-h-0 flex-1">
        <MessageThread
          conversation={conversation}
          onSuggestionAction={handleSuggestionAction}
        />
      </ScrollArea>

      {/* Composer */}
      <div className="shrink-0 border-t border-border bg-card/40 p-3">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Responder ${contact.name} no ${channelMeta.label}…`}
          aria-label="Escrever resposta"
          className="min-h-20 resize-none bg-background"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerate}
                className="border-ai-border text-ai hover:bg-ai/10"
              >
                <SparklesIcon aria-hidden />
                Gerar com IA
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Gera um rascunho com o GraphRAG <AiTag className="ml-1">IA</AiTag>
            </TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              Enter envia · Shift+Enter quebra linha
            </span>
            <Separator orientation="vertical" className="h-5" />
            <Button size="sm" disabled={draft.trim().length === 0}>
              <SendIcon aria-hidden />
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
