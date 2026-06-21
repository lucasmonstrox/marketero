"use client"

import { MousePointerSquareDashedIcon, PaletteIcon, SlidersIcon } from "lucide-react"

import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

import { BlockInspector } from "./block-inspector"
import { TenantThemePanel } from "./tenant-theme-panel"
import type { Block, TenantTheme } from "../_data/types"

type InspectorTab = "bloco" | "tema"

interface InspectorProps {
  selectedBlock: Block | null
  onBlockChange: (block: Block) => void
  theme: TenantTheme
  onThemeChange: (theme: TenantTheme) => void
  tab: InspectorTab
  onTabChange: (tab: InspectorTab) => void
}

export function Inspector({
  selectedBlock,
  onBlockChange,
  theme,
  onThemeChange,
  tab,
  onTabChange,
}: InspectorProps) {
  return (
    <aside className="flex w-80 shrink-0 flex-col border-l bg-card">
      <Tabs
        value={tab}
        onValueChange={(v) => onTabChange(v as InspectorTab)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="flex h-9 shrink-0 items-center border-b px-2">
          <TabsList className="h-7 w-full">
            <TabsTrigger value="bloco" className="text-xs">
              <SlidersIcon className="size-3.5" />
              Bloco
            </TabsTrigger>
            <TabsTrigger value="tema" className="text-xs">
              <PaletteIcon className="size-3.5" />
              Tema do tenant
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <TabsContent value="bloco" className="mt-0">
            {selectedBlock ? (
              <BlockInspector block={selectedBlock} onChange={onBlockChange} />
            ) : (
              <NoSelection />
            )}
          </TabsContent>
          <TabsContent value="tema" className="mt-0">
            <TenantThemePanel theme={theme} onChange={onThemeChange} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  )
}

function NoSelection() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
        <MousePointerSquareDashedIcon className="size-5" />
      </div>
      <p className="text-sm font-medium text-foreground">Nenhum bloco selecionado</p>
      <p className="max-w-[15rem] text-xs text-muted-foreground">
        Clique em um bloco no preview para editar suas propriedades aqui, ou
        ajuste a marca do tenant na aba "Tema do tenant".
      </p>
    </div>
  )
}
