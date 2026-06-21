"use client"

import {
  CircleDotIcon,
  FlaskConicalIcon,
  Redo2Icon,
  SaveIcon,
  Undo2Icon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { TONE_BADGE } from "@/shared/domain/taxonomy"

interface WorkflowToolbarProps {
  name: string
  status: "active" | "draft"
  testMode: boolean
  onTestModeChange: (value: boolean) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
}

export function WorkflowToolbar({
  name,
  status,
  testMode,
  onTestModeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
}: WorkflowToolbarProps) {
  return (
    <div className="bg-card flex h-12 shrink-0 items-center gap-3 border-b px-3">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-sm font-semibold">{name}</h1>
        <StatusChip status={status} />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2">
          <FlaskConicalIcon
            className={cn(
              "size-3.5",
              testMode ? "text-ai" : "text-muted-foreground"
            )}
            aria-hidden
          />
          <Label htmlFor="wf-test-mode" className="cursor-pointer text-xs">
            Modo teste
          </Label>
          <Switch
            id="wf-test-mode"
            checked={testMode}
            onCheckedChange={onTestModeChange}
          />
        </div>

        <Separator orientation="vertical" className="h-5" />

        <div className="flex items-center gap-1">
          <IconBtn label="Desfazer" onClick={onUndo} disabled={!canUndo}>
            <Undo2Icon />
          </IconBtn>
          <IconBtn label="Refazer" onClick={onRedo} disabled={!canRedo}>
            <Redo2Icon />
          </IconBtn>
        </div>

        <Separator orientation="vertical" className="h-5" />

        <Button size="sm" onClick={onSave}>
          <SaveIcon />
          Salvar
        </Button>
      </div>
    </div>
  )
}

function StatusChip({ status }: { status: "active" | "draft" }) {
  const isActive = status === "active"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        isActive ? TONE_BADGE.success : TONE_BADGE.muted
      )}
    >
      <CircleDotIcon className="size-3" />
      {isActive ? "Ativo" : "Rascunho"}
    </span>
  )
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
