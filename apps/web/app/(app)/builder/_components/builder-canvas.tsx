"use client"

import * as React from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GlobeIcon,
  LayoutTemplateIcon,
  LockIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { TENANT_DOMAIN } from "../_data/tenant"
import type {
  Block,
  DeviceMode,
  TenantTheme,
} from "../_data/types"
import {
  CtaBlockView,
  DepoimentoBlockView,
  EspacadorBlockView,
  FormularioBlockView,
  HeroBlockView,
  ImagemBlockView,
  TextoBlockView,
} from "./block-renderers"

const BLOCK_LABEL: Record<Block["type"], string> = {
  hero: "Hero",
  texto: "Texto",
  imagem: "Imagem",
  formulario: "Formulário",
  cta: "Botão / CTA",
  depoimento: "Depoimento",
  espacador: "Espaçador",
}

interface BuilderCanvasProps {
  blocks: Block[]
  theme: TenantTheme
  device: DeviceMode
  selectedId: string | null
  onSelect: (id: string) => void
  onMove: (id: string, direction: "up" | "down") => void
  onRemove: (id: string) => void
}

export function BuilderCanvas({
  blocks,
  theme,
  device,
  selectedId,
  onSelect,
  onMove,
  onRemove,
}: BuilderCanvasProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col bg-muted/40">
      {/* Barra de URL simulada do preview */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b bg-card px-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 rounded-full bg-destructive/40" />
          <span className="size-2.5 rounded-full bg-warning/50" />
          <span className="size-2.5 rounded-full bg-success/50" />
        </div>
        <div className="ml-2 flex h-6 flex-1 items-center gap-1.5 rounded-md border bg-background px-2 text-xs text-muted-foreground">
          <LockIcon className="size-3 text-success" />
          <span className="truncate">{TENANT_DOMAIN}/lp/promo-decoracao</span>
          <GlobeIcon className="ml-auto size-3 opacity-50" />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex justify-center px-4 py-6 sm:px-8 sm:py-8">
          {/*
            Escopo white-label do tenant (Eixo B): as variáveis CSS são DADOS da
            marca, injetadas inline. Os blocos consomem var(--primary) etc., então
            o preview re-tematiza ao vivo quando o tema do tenant muda.
          */}
          <div
            data-tenant="bella-decor"
            style={
              {
                "--primary": theme.primary,
                "--radius": `${theme.radius}rem`,
                "--font-sans": theme.font,
                fontFamily: "var(--font-sans)",
                width: device === "mobile" ? 390 : "100%",
              } as React.CSSProperties
            }
            className={cn(
              "overflow-hidden rounded-xl border bg-background shadow-lg transition-[width] duration-300",
              device === "desktop" ? "max-w-3xl" : ""
            )}
          >
            {blocks.length === 0 ? (
              <EmptyState />
            ) : (
              blocks.map((block, index) => (
                <BlockShell
                  key={block.id}
                  label={BLOCK_LABEL[block.type]}
                  selected={block.id === selectedId}
                  isFirst={index === 0}
                  isLast={index === blocks.length - 1}
                  onSelect={() => onSelect(block.id)}
                  onMove={(dir) => onMove(block.id, dir)}
                  onRemove={() => onRemove(block.id)}
                >
                  <BlockView block={block} />
                </BlockShell>
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "hero":
      return <HeroBlockView block={block} />
    case "texto":
      return <TextoBlockView block={block} />
    case "imagem":
      return <ImagemBlockView block={block} />
    case "formulario":
      return <FormularioBlockView block={block} />
    case "cta":
      return <CtaBlockView block={block} />
    case "depoimento":
      return <DepoimentoBlockView block={block} />
    case "espacador":
      return <EspacadorBlockView block={block} />
  }
}

interface BlockShellProps {
  label: string
  selected: boolean
  isFirst: boolean
  isLast: boolean
  onSelect: () => void
  onMove: (direction: "up" | "down") => void
  onRemove: () => void
  children: React.ReactNode
}

function BlockShell({
  label,
  selected,
  isFirst,
  isLast,
  onSelect,
  onMove,
  onRemove,
  children,
}: BlockShellProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Bloco ${label}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        "group/block relative cursor-pointer outline-none transition-shadow",
        selected
          ? "ring-2 ring-primary ring-inset"
          : "hover:ring-2 hover:ring-primary/30 hover:ring-inset focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset"
      )}
    >
      {/* Etiqueta + controles do bloco (chrome do produto, tokens do produto) */}
      <div
        className={cn(
          "absolute top-2 left-2 z-10 flex items-center gap-1 transition-opacity",
          selected
            ? "opacity-100"
            : "opacity-0 group-hover/block:opacity-100 group-focus-visible/block:opacity-100"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary-foreground uppercase shadow-sm">
          {label}
        </span>
      </div>

      <div
        className={cn(
          "absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded-md border bg-card p-0.5 shadow-sm transition-opacity",
          selected
            ? "opacity-100"
            : "opacity-0 group-hover/block:opacity-100 group-focus-visible/block:opacity-100"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={isFirst}
              aria-label="Mover bloco para cima"
              onClick={() => onMove("up")}
            >
              <ArrowUpIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Subir</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={isLast}
              aria-label="Mover bloco para baixo"
              onClick={() => onMove("down")}
            >
              <ArrowDownIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Descer</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Remover bloco"
              onClick={onRemove}
            >
              <Trash2Icon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remover</TooltipContent>
        </Tooltip>
      </div>

      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 px-8 py-20 text-center">
      <div className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
        <LayoutTemplateIcon className="size-6" />
      </div>
      <h3 className="text-base font-medium text-foreground">
        Sua página está vazia
      </h3>
      <p className="max-w-xs text-sm text-muted-foreground">
        Comece adicionando blocos pela paleta à esquerda — um Hero, um
        Formulário de captura e um Depoimento já formam uma landing page.
      </p>
    </div>
  )
}
