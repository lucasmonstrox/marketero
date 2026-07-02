"use client"

import { MegaphoneIcon, SearchIcon, UserRoundIcon, WorkflowIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui/components/command"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"

import { NAV_SECTIONS } from "./nav"

// Mock até a busca server-side existir: entidades de exemplo pra dar corpo à
// paleta. O filtro é o client-side do cmdk (fuzzy sobre o texto do item).
const MOCK_CONTACTS = [
  { id: "c1", name: "Ana Beatriz Souza", phone: "+55 11 98765-4321" },
  { id: "c2", name: "Carlos Mendes", phone: "+55 21 99876-5432" },
  { id: "c3", name: "Fernanda Lima", phone: "+55 31 91234-5678" },
]

const MOCK_CAMPAIGNS = [
  { id: "cp1", name: "Black Friday — recuperação de carrinho" },
  { id: "cp2", name: "Boas-vindas novos leads" },
]

const MOCK_WORKFLOWS = [
  { id: "w1", name: "Follow-up pós-proposta" },
  { id: "w2", name: "Qualificação automática de lead" },
]

/**
 * Busca global da sidebar: paleta de comandos ⌘K (shadcn/cmdk) com a navegação
 * do app + entidades mockadas (contatos, campanhas, workflows). Selecionar um
 * item navega pra página correspondente. Atalho global ⌘K (Mac) / Ctrl+K
 * (Windows/Linux). A busca real (server-side) entra numa leva futura.
 */
export function SidebarSearch() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  const navItems = NAV_SECTIONS.flatMap((section) => section.items)

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setOpen(true)}
            tooltip="Pesquisar"
            className="text-sidebar-foreground/70"
          >
            <SearchIcon />
            <span>Pesquisar</span>
            <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-sidebar-border bg-sidebar px-1.5 font-mono text-[10px] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Pesquisar"
        description="Busque contatos, campanhas e workflows, ou navegue pelo app"
      >
        <Command>
          <CommandInput placeholder="Buscar contatos, campanhas, workflows…" />
          <CommandList>
            <CommandEmpty>Nenhum resultado.</CommandEmpty>

            <CommandGroup heading="Navegação">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <CommandItem
                    key={item.href}
                    value={`nav ${item.title}`}
                    onSelect={() => go(item.href)}
                  >
                    <Icon />
                    <span>{item.title}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>

            <CommandSeparator />
            <CommandGroup heading="Contatos">
              {MOCK_CONTACTS.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={`contato ${contact.name}`}
                  onSelect={() => go("/inbox")}
                >
                  <UserRoundIcon />
                  <span className="truncate">{contact.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {contact.phone}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Campanhas">
              {MOCK_CAMPAIGNS.map((campaign) => (
                <CommandItem
                  key={campaign.id}
                  value={`campanha ${campaign.name}`}
                  onSelect={() => go("/campanhas")}
                >
                  <MegaphoneIcon />
                  <span className="truncate">{campaign.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Workflows">
              {MOCK_WORKFLOWS.map((workflow) => (
                <CommandItem
                  key={workflow.id}
                  value={`workflow ${workflow.name}`}
                  onSelect={() => go("/workflows")}
                >
                  <WorkflowIcon />
                  <span className="truncate">{workflow.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
