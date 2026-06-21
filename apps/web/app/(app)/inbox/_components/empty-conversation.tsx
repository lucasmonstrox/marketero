"use client"

import { MessageSquareIcon } from "lucide-react"

/** Estado vazio do painel central quando nenhuma conversa está selecionada. */
export function EmptyConversation() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <MessageSquareIcon className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">
          Selecione uma conversa
        </p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Escolha uma conversa na lista à esquerda para ver o histórico, as
          sugestões do GraphRAG e o contexto do contato.
        </p>
      </div>
    </div>
  )
}
