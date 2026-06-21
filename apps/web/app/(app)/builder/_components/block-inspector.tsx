"use client"

import * as React from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MousePointerClickIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { createField } from "../_data/blocks"
import type {
  Block,
  CtaBlock,
  DepoimentoBlock,
  EspacadorBlock,
  FieldType,
  FormField,
  FormularioBlock,
  HeroBlock,
  ImagemBlock,
  TextoBlock,
} from "../_data/types"

interface BlockInspectorProps {
  block: Block
  onChange: (block: Block) => void
}

const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  texto: "Texto",
  email: "Email",
  telefone: "Telefone",
  selecao: "Seleção",
  checkbox: "Checkbox",
  slider: "Slider",
}

export function BlockInspector({ block, onChange }: BlockInspectorProps) {
  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">
          Propriedades do bloco
        </h3>
        <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
          {block.type}
        </span>
      </div>
      <Separator />
      {renderEditor(block, onChange)}
    </div>
  )
}

function renderEditor(block: Block, onChange: (b: Block) => void) {
  switch (block.type) {
    case "hero":
      return <HeroEditor block={block} onChange={onChange} />
    case "texto":
      return <TextoEditor block={block} onChange={onChange} />
    case "imagem":
      return <ImagemEditor block={block} onChange={onChange} />
    case "formulario":
      return <FormularioEditor block={block} onChange={onChange} />
    case "cta":
      return <CtaEditor block={block} onChange={onChange} />
    case "depoimento":
      return <DepoimentoEditor block={block} onChange={onChange} />
    case "espacador":
      return <EspacadorEditor block={block} onChange={onChange} />
  }
}

/* --------------------------- Campos reutilizáveis ------------------------- */

function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/* ------------------------------- Editores -------------------------------- */

function HeroEditor({
  block,
  onChange,
}: {
  block: HeroBlock
  onChange: (b: Block) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Eyebrow" htmlFor="hero-eyebrow">
        <Input
          id="hero-eyebrow"
          value={block.eyebrow}
          onChange={(e) => onChange({ ...block, eyebrow: e.target.value })}
        />
      </Field>
      <Field label="Título" htmlFor="hero-title">
        <Textarea
          id="hero-title"
          value={block.title}
          rows={2}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
        />
      </Field>
      <Field label="Subtítulo" htmlFor="hero-subtitle">
        <Textarea
          id="hero-subtitle"
          value={block.subtitle}
          rows={3}
          onChange={(e) => onChange({ ...block, subtitle: e.target.value })}
        />
      </Field>
      <Field
        label="Texto da capa (alt)"
        htmlFor="hero-cover"
        hint="Descrição da imagem de capa para acessibilidade."
      >
        <Input
          id="hero-cover"
          value={block.coverLabel}
          onChange={(e) => onChange({ ...block, coverLabel: e.target.value })}
        />
      </Field>
    </div>
  )
}

function TextoEditor({
  block,
  onChange,
}: {
  block: TextoBlock
  onChange: (b: Block) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Título" htmlFor="texto-heading">
        <Input
          id="texto-heading"
          value={block.heading}
          onChange={(e) => onChange({ ...block, heading: e.target.value })}
        />
      </Field>
      <Field label="Corpo" htmlFor="texto-body">
        <Textarea
          id="texto-body"
          value={block.body}
          rows={5}
          onChange={(e) => onChange({ ...block, body: e.target.value })}
        />
      </Field>
    </div>
  )
}

function ImagemEditor({
  block,
  onChange,
}: {
  block: ImagemBlock
  onChange: (b: Block) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Texto alternativo (alt)"
        htmlFor="img-alt"
        hint="Obrigatório para acessibilidade (WCAG AA)."
      >
        <Input
          id="img-alt"
          value={block.alt}
          onChange={(e) => onChange({ ...block, alt: e.target.value })}
        />
      </Field>
      <Field label="Legenda" htmlFor="img-caption">
        <Input
          id="img-caption"
          value={block.caption}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
        />
      </Field>
      <Field label="Proporção" htmlFor="img-ratio">
        <Select
          value={block.ratio}
          onValueChange={(v) =>
            onChange({ ...block, ratio: v as ImagemBlock["ratio"] })
          }
        >
          <SelectTrigger id="img-ratio" size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="16/9">16 : 9 (paisagem)</SelectItem>
            <SelectItem value="4/3">4 : 3 (clássico)</SelectItem>
            <SelectItem value="1/1">1 : 1 (quadrado)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}

function CtaEditor({
  block,
  onChange,
}: {
  block: CtaBlock
  onChange: (b: Block) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Texto do botão" htmlFor="cta-label">
        <Input
          id="cta-label"
          value={block.label}
          onChange={(e) => onChange({ ...block, label: e.target.value })}
        />
      </Field>
      <Field label="Link de destino" htmlFor="cta-href">
        <Input
          id="cta-href"
          value={block.href}
          onChange={(e) => onChange({ ...block, href: e.target.value })}
        />
      </Field>
      <Field label="Estilo" htmlFor="cta-variant">
        <Select
          value={block.variant}
          onValueChange={(v) =>
            onChange({ ...block, variant: v as CtaBlock["variant"] })
          }
        >
          <SelectTrigger id="cta-variant" size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solido">Sólido</SelectItem>
            <SelectItem value="contorno">Contorno</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
        <MousePointerClickIcon className="size-3.5 shrink-0" />
        Botões herdam a cor da marca (var(--primary)) do tema do tenant.
      </div>
    </div>
  )
}

function DepoimentoEditor({
  block,
  onChange,
}: {
  block: DepoimentoBlock
  onChange: (b: Block) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Depoimento" htmlFor="dep-quote">
        <Textarea
          id="dep-quote"
          value={block.quote}
          rows={4}
          onChange={(e) => onChange({ ...block, quote: e.target.value })}
        />
      </Field>
      <Field label="Autor" htmlFor="dep-author">
        <Input
          id="dep-author"
          value={block.author}
          onChange={(e) => onChange({ ...block, author: e.target.value })}
        />
      </Field>
      <Field label="Cargo / local" htmlFor="dep-role">
        <Input
          id="dep-role"
          value={block.role}
          onChange={(e) => onChange({ ...block, role: e.target.value })}
        />
      </Field>
      <Field label="Avaliação" htmlFor="dep-rating">
        <Select
          value={String(block.rating)}
          onValueChange={(v) => onChange({ ...block, rating: Number(v) })}
        >
          <SelectTrigger id="dep-rating" size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 4, 3, 2, 1].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} {n === 1 ? "estrela" : "estrelas"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}

function EspacadorEditor({
  block,
  onChange,
}: {
  block: EspacadorBlock
  onChange: (b: Block) => void
}) {
  return (
    <Field label="Altura" htmlFor="sp-size">
      <Select
        value={block.size}
        onValueChange={(v) =>
          onChange({ ...block, size: v as EspacadorBlock["size"] })
        }
      >
        <SelectTrigger id="sp-size" size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sm">Pequeno</SelectItem>
          <SelectItem value="md">Médio</SelectItem>
          <SelectItem value="lg">Grande</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  )
}

/* --------------------------- Editor de formulário ------------------------ */

function FormularioEditor({
  block,
  onChange,
}: {
  block: FormularioBlock
  onChange: (b: Block) => void
}) {
  function updateField(id: string, patch: Partial<FormField>) {
    onChange({
      ...block,
      fields: block.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })
  }

  function removeField(id: string) {
    onChange({ ...block, fields: block.fields.filter((f) => f.id !== id) })
  }

  function moveField(id: string, dir: "up" | "down") {
    const idx = block.fields.findIndex((f) => f.id === id)
    if (idx < 0) return
    const target = dir === "up" ? idx - 1 : idx + 1
    if (target < 0 || target >= block.fields.length) return
    const next = [...block.fields]
    const tmp = next[idx]!
    next[idx] = next[target]!
    next[target] = tmp
    onChange({ ...block, fields: next })
  }

  function addField(type: FieldType) {
    onChange({ ...block, fields: [...block.fields, createField(type)] })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Título do formulário" htmlFor="form-title">
        <Input
          id="form-title"
          value={block.title}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
        />
      </Field>
      <Field label="Descrição" htmlFor="form-desc">
        <Textarea
          id="form-desc"
          value={block.description}
          rows={2}
          onChange={(e) => onChange({ ...block, description: e.target.value })}
        />
      </Field>

      <Separator />

      {/* Lista de campos */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-foreground">
            Campos ({block.fields.length})
          </h4>
        </div>
        <div className="flex flex-col gap-2">
          {block.fields.map((field, index) => (
            <FieldEditorRow
              key={field.id}
              field={field}
              isFirst={index === 0}
              isLast={index === block.fields.length - 1}
              onUpdate={(patch) => updateField(field.id, patch)}
              onRemove={() => removeField(field.id)}
              onMove={(dir) => moveField(field.id, dir)}
            />
          ))}
          {block.fields.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/40 p-3 text-center text-[11px] text-muted-foreground">
              Nenhum campo. Adicione abaixo ou pela paleta "Campos".
            </p>
          ) : null}
        </div>

        {/* Adicionar campo */}
        <AddFieldMenu onAdd={addField} />
      </div>

      <Separator />

      {/* Consentimento + anti-spam + CTA */}
      <Field
        label="Texto de consentimento (LGPD)"
        htmlFor="form-consent"
        hint="Obrigatório — exibido com checkbox marcável no formulário."
      >
        <Textarea
          id="form-consent"
          value={block.consentLabel}
          rows={3}
          onChange={(e) => onChange({ ...block, consentLabel: e.target.value })}
        />
      </Field>

      <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 p-2.5">
        <Label htmlFor="form-antispam" className="text-xs font-normal">
          Verificação anti-spam (Turnstile)
        </Label>
        <Switch
          id="form-antispam"
          checked={block.antiSpam}
          onCheckedChange={(v) => onChange({ ...block, antiSpam: v })}
        />
      </div>

      <Field label="Texto do botão de envio" htmlFor="form-submit">
        <Input
          id="form-submit"
          value={block.submitLabel}
          onChange={(e) => onChange({ ...block, submitLabel: e.target.value })}
        />
      </Field>
    </div>
  )
}

function FieldEditorRow({
  field,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMove,
}: {
  field: FormField
  isFirst: boolean
  isLast: boolean
  onUpdate: (patch: Partial<FormField>) => void
  onRemove: () => void
  onMove: (dir: "up" | "down") => void
}) {
  const labelId = `fld-${field.id}-label`
  const hasOptions = field.type === "selecao"

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-background p-2.5">
      <div className="flex items-center gap-1.5">
        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
          {FIELD_TYPE_LABEL[field.type]}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isFirst}
            aria-label="Mover campo para cima"
            onClick={() => onMove("up")}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isLast}
            aria-label="Mover campo para baixo"
            onClick={() => onMove("down")}
          >
            <ArrowDownIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remover campo"
            onClick={onRemove}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={labelId} className="sr-only">
          Rótulo do campo
        </Label>
        <Input
          id={labelId}
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="h-7 text-xs"
          placeholder="Rótulo do campo"
        />
        {hasOptions ? (
          <Input
            value={(field.options ?? []).join(", ")}
            onChange={(e) =>
              onUpdate({
                options: e.target.value
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean),
              })
            }
            className="h-7 text-xs"
            placeholder="Opções separadas por vírgula"
          />
        ) : null}
      </div>

      {field.type !== "checkbox" && field.type !== "slider" ? (
        <label
          className={cn(
            "flex items-center justify-between text-[11px] text-muted-foreground"
          )}
        >
          Obrigatório
          <Switch
            size="sm"
            checked={field.required}
            onCheckedChange={(v) => onUpdate({ required: v })}
            aria-label="Campo obrigatório"
          />
        </label>
      ) : null}
    </div>
  )
}

function AddFieldMenu({ onAdd }: { onAdd: (type: FieldType) => void }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-dashed p-2">
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        Adicionar campo
      </span>
      <div className="grid grid-cols-3 gap-1">
        {(Object.keys(FIELD_TYPE_LABEL) as FieldType[]).map((type) => (
          <Button
            key={type}
            variant="outline"
            size="xs"
            className="justify-start"
            onClick={() => onAdd(type)}
          >
            <PlusIcon />
            {FIELD_TYPE_LABEL[type]}
          </Button>
        ))}
      </div>
    </div>
  )
}
