"use client"

import * as React from "react"
import { MoreHorizontalIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { formatRelative } from "@/shared/lib/format"

import {
  TEAM_MEMBERS,
  TEAM_ROLE_META,
  type TeamMemberSettings,
  type TeamRole,
} from "../_data/settings"
import { StatusBadge } from "./status-badge"

const ROLE_ORDER: TeamRole[] = ["admin", "operador", "vendedor"]

/**
 * Equipe (design-system §7.1): tabela densa de membros — avatar, nome/e-mail,
 * papel editável (Select), último acesso e ações. O papel governa o acesso aos
 * leads (leads-crm.md §5 — Vendedor vê só os próprios). "Convidar" no cabeçalho.
 */
export function TeamSettings() {
  const [roles, setRoles] = React.useState<Record<string, TeamRole>>(() =>
    Object.fromEntries(TEAM_MEMBERS.map((m) => [m.id, m.role]))
  )

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Membro</TableHead>
          <TableHead className="w-[10.5rem]">Papel</TableHead>
          <TableHead>Último acesso</TableHead>
          <TableHead className="w-10 text-right">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {TEAM_MEMBERS.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            role={roles[member.id] ?? member.role}
            onRoleChange={(role) =>
              setRoles((prev) => ({ ...prev, [member.id]: role }))
            }
          />
        ))}
      </TableBody>
    </Table>
  )
}

function MemberRow({
  member,
  role,
  onRoleChange,
}: {
  member: TeamMemberSettings
  role: TeamRole
  onRoleChange: (role: TeamRole) => void
}) {
  const invited = member.status === "invited"
  const selectId = `role-${member.id}`

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <Avatar size="sm">
            <AvatarFallback>{member.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium">
                {member.name}
              </span>
              {invited ? (
                <StatusBadge tone="warning" label="Convite pendente" dot={false} />
              ) : null}
            </div>
            <span className="text-muted-foreground truncate text-xs">
              {member.email}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <label htmlFor={selectId} className="sr-only">
          Papel de {member.name}
        </label>
        <Select
          value={role}
          onValueChange={(v) => onRoleChange(v as TeamRole)}
          disabled={member.role === "admin"}
        >
          <SelectTrigger id={selectId} size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_ORDER.map((r) => (
              <SelectItem key={r} value={r}>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm">{TEAM_ROLE_META[r].label}</span>
                  <span className="text-muted-foreground text-xs">
                    {TEAM_ROLE_META[r].hint}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {member.lastSeenAt ? formatRelative(member.lastSeenAt) : "—"}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Ações de ${member.name}`}
            >
              <MoreHorizontalIcon aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              {invited ? "Reenviar convite" : "Ver perfil"}
            </DropdownMenuItem>
            <DropdownMenuItem>Redefinir senha</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={member.role === "admin"}
            >
              {invited ? "Cancelar convite" : "Remover do time"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
