import { SparklesIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Marca visual de tudo que vem do GraphRAG (design-system §princípio 2 e §8.2).
 * Usa o accent dedicado de IA (`--ai`) + ícone sparkle para que "isto é IA" seja
 * lido instantaneamente. Use em qualquer sugestão, classificação ou resposta
 * gerada — no inbox, nos nós de IA do workflow, nos criativos, etc.
 */
export function AiTag({
  children = "IA",
  className,
  icon = true,
}: {
  children?: React.ReactNode
  className?: string
  icon?: boolean
}) {
  return (
    <span
      className={cn(
        "border-ai-border text-ai bg-ai/10 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
        className
      )}
    >
      {icon ? <SparklesIcon className="size-3" /> : null}
      {children}
    </span>
  )
}
