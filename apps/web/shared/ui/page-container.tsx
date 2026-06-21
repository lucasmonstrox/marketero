import * as React from "react"

import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Enquadramento das páginas-documento (visão geral, métricas, campanhas,
 * configurações): largura máxima contida + padding de operação + rolagem
 * vertical própria. Editores full-bleed (inbox, funil, workflows, builder)
 * NÃO usam este wrapper — ocupam `h-full` diretamente.
 */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <ScrollArea className="min-h-0 w-full flex-1">
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 md:px-6",
          className
        )}
      >
        {children}
      </div>
    </ScrollArea>
  )
}
