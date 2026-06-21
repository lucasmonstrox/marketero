"use client"

import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { cn } from "@workspace/ui/lib/utils"

import { AiTag } from "@/shared/ui/ai-tag"

import { templateIcon } from "../_data/icons"
import { PALETTE_GROUPS } from "../_data/palette"
import type { NodeKind, PaletteItem } from "../_data/types"

/** Realce tonal do ícone por família (token, nunca hex). */
const KIND_ICON_TONE: Record<NodeKind, string> = {
  trigger: "bg-info/10 text-info",
  ai: "bg-ai/10 text-ai",
  condition: "bg-warning/15 text-warning-foreground",
  action: "bg-success/10 text-success",
}

interface NodePaletteProps {
  /** Adiciona o template ao canvas (click) — drag também dispara onDragStart. */
  onAdd: (item: PaletteItem) => void
}

export function NodePalette({ onAdd }: NodePaletteProps) {
  return (
    <aside className="bg-card flex w-56 shrink-0 flex-col border-r">
      <div className="flex h-10 shrink-0 items-center px-3">
        <h2 className="text-xs font-semibold tracking-wide uppercase">
          Blocos
        </h2>
        <span className="text-muted-foreground ml-auto text-[11px]">
          clique p/ inserir
        </span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 px-2 pb-6">
          {PALETTE_GROUPS.map((group) => (
            <section key={group.kind} className="space-y-1">
              <div className="flex items-center gap-1.5 px-1.5 pt-1">
                <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                  {group.label}
                </h3>
                {group.kind === "ai" ? <AiTag icon={false} /> : null}
              </div>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.template}>
                    <PaletteButton
                      item={item}
                      onClick={() => onAdd(item)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </ScrollArea>
    </aside>
  )
}

function PaletteButton({
  item,
  onClick,
}: {
  item: PaletteItem
  onClick: () => void
}) {
  const Icon = templateIcon(item.icon)

  function handleDragStart(event: React.DragEvent<HTMLButtonElement>) {
    event.dataTransfer.setData("application/marketero-node", item.template)
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <button
      type="button"
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      title={item.hint}
      aria-label={`Adicionar bloco ${item.label}`}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left",
        "hover:border-border hover:bg-muted/60 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        "active:translate-y-px"
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md",
          KIND_ICON_TONE[item.kind]
        )}
      >
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium leading-tight">
          {item.label}
        </span>
        <span className="text-muted-foreground block truncate text-[11px] leading-tight">
          {item.hint}
        </span>
      </span>
    </button>
  )
}
