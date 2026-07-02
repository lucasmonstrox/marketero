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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

import { useCreateStage, useUpdateStage } from "@/shared/api/use-stages"
import type { StageType } from "@/shared/domain/taxonomy"

import {
  ACCENT_OPTIONS,
  accentKey,
  STAGE_ACCENT_CLASSES,
  type StageAccent,
} from "../_lib/accents"
import type { UiStage } from "../_lib/board-adapter"

const STAGE_TYPE_LABEL: Record<StageType, string> = {
  new: "Novo (entrada)",
  active: "Ativo (em andamento)",
  won: "Ganho (absorvente)",
  lost: "Perdido (absorvente)",
}

interface StageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pipelineId: string
  /** Presente → editar; ausente → criar no fim do board. */
  stage?: UiStage | null
}

export function StageDialog({ open, onOpenChange, pipelineId, stage }: StageDialogProps) {
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<StageType>("active")
  const [wipLimit, setWipLimit] = React.useState("0")
  const [accent, setAccent] = React.useState<StageAccent>({ kind: "chart", n: 1 })

  const create = useCreateStage()
  const update = useUpdateStage()
  const editing = Boolean(stage)
  const pending = create.isPending || update.isPending

  React.useEffect(() => {
    if (!open) return
    setName(stage?.name ?? "")
    setType(stage?.type ?? "active")
    setWipLimit(String(stage?.wipLimit ?? 0))
    setAccent(stage?.accent ?? { kind: "chart", n: 1 })
  }, [open, stage])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const wip = Math.max(0, Number.parseInt(wipLimit, 10) || 0)
    const body = { name: trimmed, type, wipLimit: wip, accent }
    const close = () => onOpenChange(false)
    if (stage) update.mutate({ id: stage.id, ...body }, { onSuccess: close })
    else create.mutate({ pipelineId, ...body }, { onSuccess: close })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar etapa" : "Nova etapa"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Nome, papel, limite WIP e cor da coluna."
              : "A etapa entra no fim do board — arraste pela ordem depois."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="stage-name">Nome</Label>
            <Input
              id="stage-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Qualificado"
              autoFocus
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Papel</Label>
              <Select value={type} onValueChange={(v) => setType(v as StageType)}>
                <SelectTrigger aria-label="Papel da etapa">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STAGE_TYPE_LABEL) as StageType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {STAGE_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="stage-wip">Limite WIP</Label>
              <Input
                id="stage-wip"
                type="number"
                min={0}
                value={wipLimit}
                onChange={(e) => setWipLimit(e.target.value)}
                placeholder="0 = sem limite"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Cor da coluna</Label>
            <div className="flex items-center gap-2">
              {ACCENT_OPTIONS.map((option) => {
                const key = accentKey(option)
                const classes = STAGE_ACCENT_CLASSES[key]!
                const selected = accentKey(accent) === key
                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={`Acento ${key}`}
                    aria-pressed={selected}
                    onClick={() => setAccent(option)}
                    className={cn(
                      "size-6 rounded-full transition-transform",
                      classes.dot,
                      selected
                        ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                        : "hover:scale-110"
                    )}
                  />
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || pending}>
              {editing ? "Salvar" : "Criar etapa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
