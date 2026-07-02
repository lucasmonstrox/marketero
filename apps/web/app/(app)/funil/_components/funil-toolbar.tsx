"use client"

import {
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UsersIcon,
  ZapIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"

import type { PipelineResponse } from "@/shared/api/types"
import { ChannelIcon } from "@/shared/ui/channel-icon"
import { CHANNEL_META, MVP_CHANNELS } from "@/shared/domain/channels"

/** Valor sentinela do Select — intercepta "Nova pipeline…" sem trocar a seleção. */
const NEW_PIPELINE = "__new__"

interface FunilToolbarProps {
  pipelines: PipelineResponse[]
  pipelineId: string | null
  onPipelineChange: (id: string) => void
  onNewPipeline: () => void
  onRenamePipeline: () => void
  onDeletePipeline: () => void
  /** Responsáveis distintos presentes no board (filtro). */
  owners: string[]
  query: string
  onQueryChange: (value: string) => void
  channelFilter: string
  onChannelFilterChange: (value: string) => void
  ownerFilter: string
  onOwnerFilterChange: (value: string) => void
  onOpenAutomations: () => void
  onNewCard: () => void
  onOpenContacts: () => void
}

export function FunilToolbar({
  pipelines,
  pipelineId,
  onPipelineChange,
  onNewPipeline,
  onRenamePipeline,
  onDeletePipeline,
  owners,
  query,
  onQueryChange,
  channelFilter,
  onChannelFilterChange,
  ownerFilter,
  onOwnerFilterChange,
  onOpenAutomations,
  onNewCard,
  onOpenContacts,
}: FunilToolbarProps) {
  const current = pipelines.find((p) => p.id === pipelineId)

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
      {/* Pipeline switcher */}
      <Select
        value={pipelineId ?? ""}
        onValueChange={(value) => {
          if (value === NEW_PIPELINE) onNewPipeline()
          else onPipelineChange(value)
        }}
      >
        <SelectTrigger
          size="sm"
          className="h-8 min-w-44 font-medium"
          aria-label="Selecionar funil"
        >
          <SelectValue placeholder="Carregando…" />
        </SelectTrigger>
        <SelectContent>
          {pipelines.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={NEW_PIPELINE}>
            <PlusIcon className="size-3.5" />
            Nova pipeline…
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Ações da pipeline atual */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Ações da pipeline"
            disabled={!current}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={onRenamePipeline}>
            <PencilIcon className="size-3.5" />
            Renomear pipeline
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={current?.isDefault}
            onSelect={onDeletePipeline}
          >
            <Trash2Icon className="size-3.5" />
            {current?.isDefault ? "Excluir (pipeline padrão)" : "Excluir pipeline"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-1 h-5" />

      {/* Busca */}
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Label htmlFor="funil-busca" className="sr-only">
          Buscar cards
        </Label>
        <Input
          id="funil-busca"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar contato, produto, tag…"
          className="h-8 w-56 pl-8"
        />
      </div>

      {/* Filtro por canal */}
      <Select value={channelFilter} onValueChange={onChannelFilterChange}>
        <SelectTrigger size="sm" className="h-8" aria-label="Filtrar por canal">
          <SelectValue placeholder="Canal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os canais</SelectItem>
          <SelectSeparator />
          {MVP_CHANNELS.map((ch) => (
            <SelectItem key={ch} value={ch}>
              <ChannelIcon channel={ch} className="size-3.5" />
              {CHANNEL_META[ch].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtro por responsável (derivado dos cards do board) */}
      {owners.length > 0 ? (
        <Select value={ownerFilter} onValueChange={onOwnerFilterChange}>
          <SelectTrigger
            size="sm"
            className="h-8"
            aria-label="Filtrar por responsável"
          >
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            <SelectSeparator />
            {owners.map((owner) => (
              <SelectItem key={owner} value={owner}>
                {owner}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onOpenContacts}>
          <UsersIcon className="size-3.5" />
          Contatos
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenAutomations}>
          <ZapIcon className="size-3.5" />
          Automações
        </Button>
        <Button size="sm" onClick={onNewCard}>
          <PlusIcon className="size-3.5" />
          Novo card
        </Button>
      </div>
    </div>
  )
}
