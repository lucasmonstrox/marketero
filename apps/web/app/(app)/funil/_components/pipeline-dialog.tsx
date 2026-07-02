"use client"

import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { useCreatePipeline, useRenamePipeline } from "@/shared/api/use-pipelines"

/**
 * Colunas default de uma pipeline nova. A API sem `stages` cria um kanban
 * VAZIO — e cards só nascem em etapa type=new, então semear o esqueleto
 * canônico aqui evita um board inutilizável.
 */
const DEFAULT_STAGES = [
  { name: "Novo", type: "new" as const, accent: { kind: "chart" as const, n: 1 as const } },
  { name: "Em andamento", type: "active" as const, accent: { kind: "chart" as const, n: 2 as const } },
  { name: "Ganho", type: "won" as const, accent: { kind: "tone" as const, tone: "success" } },
  { name: "Perdido", type: "lost" as const, accent: { kind: "tone" as const, tone: "destructive" } },
]

interface PipelineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Presente → renomear; ausente → criar. */
  pipeline?: { id: string; name: string } | null
  /** Criação: recebe o id novo para trocar a seleção do board. */
  onCreated?: (id: string) => void
}

export function PipelineDialog({ open, onOpenChange, pipeline, onCreated }: PipelineDialogProps) {
  const [name, setName] = React.useState("")
  const create = useCreatePipeline()
  const rename = useRenamePipeline()
  const editing = Boolean(pipeline)
  const pending = create.isPending || rename.isPending

  React.useEffect(() => {
    if (open) setName(pipeline?.name ?? "")
  }, [open, pipeline])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (pipeline) {
      rename.mutate(
        { id: pipeline.id, name: trimmed },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      create.mutate(
        { name: trimmed, stages: DEFAULT_STAGES },
        {
          onSuccess: (created) => {
            onOpenChange(false)
            onCreated?.(created.id)
          },
        },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Renomear pipeline" : "Nova pipeline"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "O novo nome aparece no seletor de funis."
              : "Criada com as etapas Novo, Em andamento, Ganho e Perdido — ajuste depois."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pipeline-name">Nome</Label>
            <Input
              id="pipeline-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Vendas B2B"
              autoFocus
              maxLength={100}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || pending}>
              {editing ? "Salvar" : "Criar pipeline"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
