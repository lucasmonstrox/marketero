"use client"

import { PlusIcon, SearchIcon, ZapIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
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

import { ChannelIcon } from "@/shared/ui/channel-icon"
import { CHANNEL_META, MVP_CHANNELS } from "@/shared/domain/channels"

import { PIPELINES, TEAM } from "../_data/pipelines"

interface FunilToolbarProps {
  pipelineId: string
  onPipelineChange: (id: string) => void
  query: string
  onQueryChange: (value: string) => void
  channelFilter: string
  onChannelFilterChange: (value: string) => void
  ownerFilter: string
  onOwnerFilterChange: (value: string) => void
  onOpenAutomations: () => void
}

const OWNER_IDS = ["ana", "bruno", "carla", "diego", "ia"] as const

export function FunilToolbar({
  pipelineId,
  onPipelineChange,
  query,
  onQueryChange,
  channelFilter,
  onChannelFilterChange,
  ownerFilter,
  onOwnerFilterChange,
  onOpenAutomations,
}: FunilToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
      {/* Pipeline switcher */}
      <Select value={pipelineId} onValueChange={onPipelineChange}>
        <SelectTrigger
          size="sm"
          className="h-8 min-w-44 font-medium"
          aria-label="Selecionar funil"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PIPELINES.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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

      {/* Filtro por responsável */}
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
          {OWNER_IDS.map((id) => (
            <SelectItem key={id} value={id}>
              {TEAM[id]!.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onOpenAutomations}>
          <ZapIcon className="size-3.5" />
          Automações
        </Button>
        <Button size="sm" onClick={onOpenAutomations}>
          <PlusIcon className="size-3.5" />
          Novo card
        </Button>
      </div>
    </div>
  )
}
