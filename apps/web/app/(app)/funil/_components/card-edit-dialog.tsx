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
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
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

import { useDeleteCard, useUpdateCard } from "@/shared/api/use-cards"
import { CHANNEL_META, type Channel, MVP_CHANNELS } from "@/shared/domain/channels"
import { INTENT_META, type Intent, INTENTS } from "@/shared/domain/taxonomy"
import { ChannelIcon } from "@/shared/ui/channel-icon"

import type { UiCard } from "../_lib/board-adapter"
import { centsToInput, parseCentsInput } from "../_lib/format-cents"

const NO_INTENT = "__none__"

interface CardEditDialogProps {
  card: UiCard | null
  pipelineId: string
  onOpenChange: (open: boolean) => void
}

export function CardEditDialog({ card, pipelineId, onOpenChange }: CardEditDialogProps) {
  const [title, setTitle] = React.useState("")
  const [valueInput, setValueInput] = React.useState("")
  const [channel, setChannel] = React.useState<Channel>("whatsapp")
  const [intent, setIntent] = React.useState<string>(NO_INTENT)
  const [tagsInput, setTagsInput] = React.useState("")
  const [assignedTo, setAssignedTo] = React.useState("")

  const update = useUpdateCard()
  const remove = useDeleteCard()

  React.useEffect(() => {
    if (!card) return
    setTitle(card.subtitle)
    setValueInput(centsToInput(card.valueCents))
    setChannel(card.channel)
    setIntent(card.intent ?? NO_INTENT)
    setTagsInput(card.tags.join(", "))
    setAssignedTo(card.ownerName ?? "")
  }, [card])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!card) return
    const trimmed = title.trim()
    if (!trimmed) return
    const cents = parseCentsInput(valueInput)
    update.mutate(
      {
        id: card.id,
        title: trimmed,
        channel,
        valueCents: cents ?? 0,
        intent: intent === NO_INTENT ? null : (intent as Intent),
        tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
        assignedTo: assignedTo.trim() || null,
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  function deleteCard() {
    if (!card) return
    remove.mutate({ id: card.id, pipelineId }, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Dialog open={Boolean(card)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar card</DialogTitle>
          <DialogDescription>
            {card ? `Contato: ${card.contactName}` : ""} — mover é pelo arraste no board.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-title">Título *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-value">Valor (R$)</Label>
              <Input
                id="edit-value"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Canal</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                <SelectTrigger aria-label="Canal do card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MVP_CHANNELS.map((ch) => (
                    <SelectItem key={ch} value={ch}>
                      <ChannelIcon channel={ch} className="size-3.5" />
                      {CHANNEL_META[ch].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Intenção</Label>
              <Select value={intent} onValueChange={setIntent}>
                <SelectTrigger aria-label="Intenção classificada">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_INTENT}>Sem classificação</SelectItem>
                  {INTENTS.map((i) => (
                    <SelectItem key={i} value={i}>
                      {INTENT_META[i].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-owner">Responsável</Label>
              <Input
                id="edit-owner"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-tags">Tags</Label>
            <Input
              id="edit-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Separadas por vírgula"
            />
          </div>

          <DialogFooter className="items-center sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm">
                  Excluir card
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir este card?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O histórico de eventos do card também é apagado. Essa ação não
                    pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteCard} disabled={remove.isPending}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!title.trim() || update.isPending}>
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
