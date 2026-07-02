"use client"

import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

import { useContacts, useCreateContact } from "@/shared/api/use-contacts"
import type { ContactResponse } from "@/shared/api/types"

interface ContactPickerProps {
  value: ContactResponse | null
  onChange: (contact: ContactResponse) => void
}

/**
 * Combobox de contatos (Popover + Command) com criação inline: digitou um nome
 * que não existe → "Criar contato…" vira um mini-form (nome/email/telefone).
 */
export function ContactPicker({ value, onChange }: ContactPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [creating, setCreating] = React.useState(false)

  const { data: contacts } = useContacts()
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

  function select(contact: ContactResponse) {
    onChange(contact)
    setOpen(false)
    setSearch("")
    setCreating(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setCreating(false)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? value.name : <span className="text-muted-foreground">Selecionar contato…</span>}
          <ChevronsUpDownIcon className="size-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {creating ? (
          <InlineContactForm initialName={search} onCreated={select} onCancel={() => setCreating(false)} />
        ) : (
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar contato…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Nenhum contato encontrado.</CommandEmpty>
              <CommandGroup>
                {filtered.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={contact.id}
                    onSelect={() => select(contact)}
                  >
                    <CheckIcon
                      className={cn(
                        "size-3.5",
                        value?.id === contact.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{contact.name}</span>
                    {contact.email ? (
                      <span className="text-muted-foreground truncate text-xs">
                        {contact.email}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem value="__create__" onSelect={() => setCreating(true)}>
                  <PlusIcon className="size-3.5" />
                  {search.trim() ? `Criar contato "${search.trim()}"…` : "Criar contato…"}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  )
}

function InlineContactForm({
  initialName,
  onCreated,
  onCancel,
}: {
  initialName: string
  onCreated: (contact: ContactResponse) => void
  onCancel: () => void
}) {
  const [name, setName] = React.useState(initialName.trim())
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const create = useCreateContact()

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    create.mutate(
      {
        name: trimmed,
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      },
      { onSuccess: onCreated },
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="text-sm font-medium">Novo contato</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-name" className="text-xs">Nome *</Label>
        <Input id="cp-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-email" className="text-xs">Email</Label>
        <Input id="cp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-phone" className="text-xs">Telefone</Label>
        <Input id="cp-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-0000" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Voltar
        </Button>
        <Button type="button" size="sm" disabled={!name.trim() || create.isPending} onClick={submit}>
          Criar contato
        </Button>
      </div>
    </div>
  )
}
