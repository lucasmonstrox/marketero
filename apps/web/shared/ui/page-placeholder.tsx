import { ConstructionIcon, type LucideIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

interface PagePlaceholderProps {
  title: string
  description?: string
  icon?: LucideIcon
  className?: string
}

/**
 * Estado "em construção" reutilizável para as páginas TODO do §7.1
 * (segue o padrão de empty-state do estudo §8.2: ícone + copy acionável pt-BR).
 */
export function PagePlaceholder({
  title,
  description,
  icon: Icon = ConstructionIcon,
  className,
}: PagePlaceholderProps) {
  return (
    <div
      className={cn(
        "flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center",
        className
      )}
    >
      <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl">
        <Icon className="size-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          {description ?? "Em construção — esta área ainda será implementada."}
        </p>
      </div>
    </div>
  )
}
