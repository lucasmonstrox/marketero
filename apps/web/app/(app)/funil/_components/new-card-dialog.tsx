"use client"

import * as React from "react"
import { toast } from "sonner"

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

import type { ContactResponse } from "@/shared/api/types"
import { useCreateCard } from "@/shared/api/use-cards"
import { CHANNEL_META, type Channel, MVP_CHANNELS } from "@/shared/domain/channels"
import { INTENT_META, type Intent, INTENTS } from "@/shared/domain/taxonomy"
import { ChannelIcon } from "@/shared/ui/channel-icon"

import { parseCentsInput } from "../_lib/format-cents"
import { ContactPicker } from "./contact-picker"

const NO_INTENT = "__none__"

interface NewCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pipelineId: string
}

/** Card sempre nasce na etapa type=new (regra da API) — o dialog avisa. */
export function NewCardDialog({ open, onOpenChange, pipelineId }: NewCardDialogProps) {
  const [title, setTitle] = React.useState("")
  const [contact, setContact] = React.useState<ContactResponse | null>(null)
  const [valueInput, setValueInput] = React.useState("")
  const [channel, setChannel] = React.useState<Channel>("whatsapp")
  const [intent, setIntent] = React.useState<string>(NO_INTENT)
  const [tagsInput, setTagsInput] = React.useState("")
  const [assignedTo, setAssignedTo] = React.useState("")

  const create = useCreateCard()

  React.useEffect(() => {
    if (!open) return
    setTitle("")
    setContact(null)
    setValueInput("")
    setChannel("whatsapp")
    setIntent(NO_INTENT)
    setTagsInput("")
    setAssignedTo("")
  }, [open])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || !contact) return
    const cents = parseCentsInput(valueInput)
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    create.mutate(
      {
        pipelineId,
        contactId: contact.id,
        title: trimmed,
        channel,
        ...(cents !== null ? { valueCents: cents } : {}),
        ...(intent !== NO_INTENT ? { intent: intent as Intent } : {}),
        ...(tags.length ? { tags } : {}),
        ...(assignedTo.trim() ? { assignedTo: assignedTo.trim() } : {}),
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success("Card criado na etapa Novo")
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo card</DialogTitle>
          <DialogDescription>
            O card entra na etapa de entrada (Novo) do funil atual.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Contato *</Label>
            <ContactPicker value={contact} onChange={setContact} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="card-title">Título *</Label>
            <Input
              id="card-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Sofá modular · Lead Ads"
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="card-value">Valor (R$)</Label>
              <Input
                id="card-value"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                placeholder="1.234,56"
                inputMode="decimal"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Canal *</Label>
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
              <Label htmlFor="card-owner">Responsável</Label>
              <Input
                id="card-owner"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Ex.: Ana Souza"
                maxLength={100}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="card-tags">Tags</Label>
            <Input
              id="card-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Separadas por vírgula: Lead Ads, SP"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || !contact || create.isPending}>
              Criar card
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
