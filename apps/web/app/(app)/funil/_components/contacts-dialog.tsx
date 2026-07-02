"use client"

import { PencilIcon, SearchIcon, Trash2Icon } from "lucide-react"
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
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

import type { ContactResponse } from "@/shared/api/types"
import {
  useContacts,
  useDeleteContact,
  useUpdateContact,
} from "@/shared/api/use-contacts"

interface ContactsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Gestão mínima de contatos: busca, edição inline e exclusão. */
export function ContactsDialog({ open, onOpenChange }: ContactsDialogProps) {
  const [search, setSearch] = React.useState("")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState<ContactResponse | null>(null)

  const { data: contacts } = useContacts()
  const remove = useDeleteContact()

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return contacts ?? []
    return (contacts ?? []).filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q),
    )
  }, [contacts, search])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contatos</DialogTitle>
          <DialogDescription>
            Contatos alimentam os cards do funil. Excluir só é possível sem
            cards vinculados.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou telefone…"
            className="pl-8"
          />
        </div>

        <ScrollArea className="max-h-80">
          <div className="flex flex-col gap-1.5 pr-2">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-6 text-center text-sm">
                Nenhum contato — crie um pelo “Novo card”.
              </p>
            ) : (
              filtered.map((contact) =>
                editingId === contact.id ? (
                  <ContactEditRow
                    key={contact.id}
                    contact={contact}
                    onDone={() => setEditingId(null)}
                  />
                ) : (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{contact.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {[contact.email, contact.phone].filter(Boolean).join(" · ") ||
                          "Sem email/telefone"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Editar ${contact.name}`}
                      onClick={() => setEditingId(contact.id)}
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Excluir ${contact.name}`}
                      onClick={() => setDeleting(contact)}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                ),
              )
            )}
          </div>
        </ScrollArea>

        <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir “{deleting?.name}”?</AlertDialogTitle>
              <AlertDialogDescription>
                Se o contato tiver cards no funil, a API bloqueia a exclusão.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={remove.isPending}
                onClick={() => {
                  if (deleting) remove.mutate(deleting.id, { onSettled: () => setDeleting(null) })
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}

function ContactEditRow({
  contact,
  onDone,
}: {
  contact: ContactResponse
  onDone: () => void
}) {
  const [name, setName] = React.useState(contact.name)
  const [email, setEmail] = React.useState(contact.email ?? "")
  const [phone, setPhone] = React.useState(contact.phone ?? "")
  const update = useUpdateContact()

  function save() {
    const trimmed = name.trim()
    if (!trimmed) return
    update.mutate(
      {
        id: contact.id,
        name: trimmed,
        email: email.trim() || null,
        phone: phone.trim() || null,
      },
      { onSuccess: onDone },
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card px-3 py-2.5">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>
          Cancelar
        </Button>
        <Button size="sm" disabled={!name.trim() || update.isPending} onClick={save}>
          Salvar
        </Button>
      </div>
    </div>
  )
}
