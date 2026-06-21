"use client"

import { PlusIcon } from "lucide-react"

import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import {
  FIELD_PALETTE,
  PALETTE_GROUPS,
} from "../_data/palette"
import type { BlockType, FieldType } from "../_data/types"

interface BlockPaletteProps {
  onAddBlock: (type: BlockType) => void
  onAddField: (type: FieldType) => void
  /** true quando há um formulário no preview (para habilitar "Campo"). */
  hasForm: boolean
}

export function BlockPalette({
  onAddBlock,
  onAddField,
  hasForm,
}: BlockPaletteProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-card">
      <div className="flex h-9 shrink-0 items-center border-b px-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Blocos
        </h2>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-3">
          {PALETTE_GROUPS.map((group) => (
            <section key={group.id} className="flex flex-col gap-1.5">
              <h3 className="px-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {group.label}
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {group.blocks.map((block) => {
                  const Icon = block.icon
                  return (
                    <Tooltip key={block.type}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onAddBlock(block.type)}
                          className="group flex flex-col items-start gap-1.5 rounded-lg border bg-background p-2 text-left transition-colors hover:border-primary/40 hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          <Icon className="size-4 text-muted-foreground group-hover:text-primary" />
                          <span className="text-xs leading-tight font-medium">
                            {block.label}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">{block.hint}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </section>
          ))}

          {/* Campos do formulário */}
          <section className="flex flex-col gap-1.5">
            <h3 className="px-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Campos
            </h3>
            {!hasForm ? (
              <p className="px-1 text-[11px] leading-snug text-muted-foreground">
                Adicione um <span className="font-medium">Formulário</span> para
                inserir campos.
              </p>
            ) : null}
            <div className="flex flex-col gap-1">
              {FIELD_PALETTE.map((field) => {
                const Icon = field.icon
                return (
                  <button
                    key={field.type}
                    type="button"
                    disabled={!hasForm}
                    onClick={() => onAddField(field.type)}
                    className={cn(
                      "group flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-xs transition-colors",
                      "hover:border-border hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      "disabled:pointer-events-none disabled:opacity-40"
                    )}
                  >
                    <Icon className="size-3.5 text-muted-foreground group-hover:text-primary" />
                    <span className="flex-1 font-medium">{field.label}</span>
                    <PlusIcon className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </ScrollArea>
    </aside>
  )
}
