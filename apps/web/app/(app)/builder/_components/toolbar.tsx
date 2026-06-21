"use client"

import {
  CheckIcon,
  CodeXmlIcon,
  GlobeIcon,
  MonitorIcon,
  RocketIcon,
  SmartphoneIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Separator } from "@workspace/ui/components/separator"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { TENANT_DOMAIN, TENANT_NAME } from "../_data/tenant"
import type { DeliveryMode, DeviceMode } from "../_data/types"

interface ToolbarProps {
  projectName: string
  onProjectNameChange: (value: string) => void
  device: DeviceMode
  onDeviceChange: (value: DeviceMode) => void
  delivery: DeliveryMode
  onDeliveryChange: (value: DeliveryMode) => void
  blockCount: number
}

const HOSTED_SNIPPET = `https://${TENANT_DOMAIN}/lp/promo-decoracao`

const EMBED_SNIPPET = `<iframe src="https://${TENANT_DOMAIN}/embed/promo-decoracao"
  width="100%" height="720" loading="lazy"
  style="border:0" title="Promoção Bella Decor"></iframe>`

export function Toolbar({
  projectName,
  onProjectNameChange,
  device,
  onDeviceChange,
  delivery,
  onDeliveryChange,
  blockCount,
}: ToolbarProps) {
  const snippet = delivery === "hosted" ? HOSTED_SNIPPET : EMBED_SNIPPET

  return (
    <div className="flex h-13 shrink-0 items-center gap-3 border-b bg-card px-3">
      {/* Identidade do projeto */}
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground"
          aria-hidden
        >
          BD
        </span>
        <div className="min-w-0">
          <Label htmlFor="builder-project-name" className="sr-only">
            Nome do projeto
          </Label>
          <Input
            id="builder-project-name"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className="h-7 w-56 border-transparent bg-transparent px-1.5 text-sm font-medium hover:border-input focus-visible:border-ring"
          />
          <p className="px-1.5 text-[11px] text-muted-foreground">
            Tenant: {TENANT_NAME} ·{" "}
            <span className="tabular-nums">{blockCount}</span> blocos
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Dispositivo */}
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground lg:inline">
            Dispositivo
          </span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={device}
            onValueChange={(v) => v && onDeviceChange(v as DeviceMode)}
            aria-label="Largura de pré-visualização"
          >
            <ToggleGroupItem value="desktop" aria-label="Desktop">
              <MonitorIcon />
              <span className="hidden sm:inline">Desktop</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="mobile" aria-label="Mobile">
              <SmartphoneIcon />
              <span className="hidden sm:inline">Mobile</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Modo de entrega + snippet */}
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={delivery}
            onValueChange={(v) => v && onDeliveryChange(v as DeliveryMode)}
            aria-label="Modo de entrega"
          >
            <ToggleGroupItem value="hosted" aria-label="Hospedado por URL">
              <GlobeIcon />
              <span className="hidden md:inline">Hospedado (URL)</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="embed" aria-label="Embed por iframe">
              <CodeXmlIcon />
              <span className="hidden md:inline">Embed (iframe)</span>
            </ToggleGroupItem>
          </ToggleGroup>

          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Ver código de publicação">
                    <CodeXmlIcon />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Ver snippet</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-96">
              <PopoverHeader>
                <PopoverTitle className="flex items-center gap-2">
                  {delivery === "hosted" ? (
                    <>
                      <GlobeIcon className="size-3.5" /> Link hospedado
                    </>
                  ) : (
                    <>
                      <CodeXmlIcon className="size-3.5" /> Snippet de incorporação
                    </>
                  )}
                </PopoverTitle>
                <PopoverDescription>
                  {delivery === "hosted"
                    ? "Compartilhe em link da bio, QR code ou campanhas."
                    : "Cole no HTML do seu site ou loja para incorporar."}
                </PopoverDescription>
              </PopoverHeader>
              <pre className="overflow-x-auto rounded-md border bg-muted/60 p-2.5 font-mono text-[11px] leading-relaxed text-foreground">
                <code>{snippet}</code>
              </pre>
            </PopoverContent>
          </Popover>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <Badge
          variant="outline"
          className="gap-1 border-success/30 bg-success/10 text-success"
        >
          <CheckIcon className="size-3" /> Rascunho salvo
        </Badge>

        <Button size="sm">
          <RocketIcon /> Publicar
        </Button>
      </div>
    </div>
  )
}
