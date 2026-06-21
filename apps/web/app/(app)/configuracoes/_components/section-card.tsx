import * as React from "react"
import type { LucideIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Casca de uma seção de configurações: âncora de scroll (`id`), cabeçalho com
 * ícone + título (+ slot de acento, ex.: AiTag) + descrição, e o corpo. Cada
 * seção da página vira um Card para leitura em bloco, alinhado ao sub-nav.
 */
export function SectionCard({
  id,
  icon: Icon,
  title,
  description,
  accent,
  action,
  children,
  className,
  contentClassName,
}: {
  id: string
  icon: LucideIcon
  title: string
  description?: string
  /** Acento opcional ao lado do título (ex.: <AiTag />). */
  accent?: React.ReactNode
  /** Ação opcional alinhada à direita do cabeçalho. */
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card
      id={id}
      className={cn("scroll-mt-20 gap-4", className)}
      aria-labelledby={`${id}-title`}
    >
      <CardHeader className="flex-row items-start gap-3">
        <span
          className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md"
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
        <div className="flex-1 space-y-1">
          <CardTitle
            id={`${id}-title`}
            className="flex items-center gap-2 text-sm"
          >
            {title}
            {accent}
          </CardTitle>
          {description ? (
            <CardDescription className="text-xs">{description}</CardDescription>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn("space-y-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
