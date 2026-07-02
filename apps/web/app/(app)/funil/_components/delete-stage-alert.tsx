"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { useDeleteStage } from "@/shared/api/use-stages"

import type { UiStage } from "../_lib/board-adapter"

interface DeleteStageAlertProps {
  stage: UiStage | null
  pipelineId: string
  /** Demais etapas do board (destinos possíveis para os cards órfãos). */
  otherStages: UiStage[]
  onOpenChange: (open: boolean) => void
}

/** Etapa com cards exige destino (`?moveCardsTo=`) — migração atômica na API. */
export function DeleteStageAlert({
  stage,
  pipelineId,
  otherStages,
  onOpenChange,
}: DeleteStageAlertProps) {
  const [moveCardsTo, setMoveCardsTo] = React.useState<string>("")
  const remove = useDeleteStage()

  const hasCards = (stage?.cards.length ?? 0) > 0
  const needsTarget = hasCards && !moveCardsTo

  React.useEffect(() => {
    if (stage) setMoveCardsTo("")
  }, [stage])

  function confirm() {
    if (!stage || needsTarget) return
    remove.mutate(
      { id: stage.id, pipelineId, ...(hasCards ? { moveCardsTo } : {}) },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <AlertDialog open={Boolean(stage)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir etapa “{stage?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasCards
              ? `A etapa tem ${stage!.cards.length} card(s) — escolha para onde movê-los.`
              : "A etapa está vazia e será removida do board."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasCards ? (
          <div className="flex flex-col gap-2">
            <Label>Mover cards para</Label>
            <Select value={moveCardsTo} onValueChange={setMoveCardsTo}>
              <SelectTrigger aria-label="Etapa de destino dos cards">
                <SelectValue placeholder="Selecionar etapa…" />
              </SelectTrigger>
              <SelectContent>
                {otherStages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} disabled={needsTarget || remove.isPending}>
            Excluir etapa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
