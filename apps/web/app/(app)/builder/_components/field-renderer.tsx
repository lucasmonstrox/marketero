"use client"

import * as React from "react"

import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Slider } from "@workspace/ui/components/slider"

import { formatCurrency } from "@/shared/lib/format"

import type { FormField } from "../_data/types"

/**
 * Renderiza um campo do formulário no PREVIEW (vitrine white-label). Densidade
 * confortável; rótulo sempre associado por `htmlFor`/`id` (WCAG AA). Os campos
 * usam `bg-background`/`var(--radius)` herdados do escopo do tenant.
 */
export function FieldRenderer({ field }: { field: FormField }) {
  const fieldId = `preview-${field.id}`
  const describedBy = field.help ? `${fieldId}-help` : undefined

  if (field.type === "checkbox") {
    return (
      <div className="flex items-start gap-2.5">
        <Checkbox
          id={fieldId}
          required={field.required}
          aria-describedby={describedBy}
          className="mt-0.5 rounded-[calc(var(--radius)*0.4)]"
        />
        <Label htmlFor={fieldId} className="text-sm leading-snug font-normal">
          {field.label}
          {field.required ? (
            <span className="text-[var(--primary)]"> *</span>
          ) : null}
        </Label>
      </div>
    )
  }

  if (field.type === "slider") {
    return <SliderField field={field} fieldId={fieldId} describedBy={describedBy} />
  }

  if (field.type === "selecao") {
    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel field={field} htmlFor={fieldId} />
        <Select>
          <SelectTrigger
            id={fieldId}
            aria-describedby={describedBy}
            className="h-10 w-full rounded-[var(--radius)] bg-background text-sm"
          >
            <SelectValue placeholder={field.placeholder ?? "Selecione..."} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldHelp field={field} id={describedBy} />
      </div>
    )
  }

  // texto / email / telefone
  const inputType =
    field.type === "email" ? "email" : field.type === "telefone" ? "tel" : "text"

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel field={field} htmlFor={fieldId} />
      <Input
        id={fieldId}
        type={inputType}
        placeholder={field.placeholder}
        required={field.required}
        aria-describedby={describedBy}
        className="h-10 rounded-[var(--radius)] bg-background text-sm"
      />
      <FieldHelp field={field} id={describedBy} />
    </div>
  )
}

function SliderField({
  field,
  fieldId,
  describedBy,
}: {
  field: FormField
  fieldId: string
  describedBy?: string
}) {
  const min = field.min ?? 0
  const max = field.max ?? 100
  const [value, setValue] = React.useState(Math.round((min + max) / 2))

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <FieldLabel field={field} htmlFor={fieldId} />
        <span className="text-sm font-semibold text-[var(--primary)] tabular-nums">
          {formatCurrency(value * 100)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={field.step ?? 1}
        onValueChange={(v) => setValue(v[0] ?? min)}
        aria-label={field.label}
        aria-describedby={describedBy}
        className="[&_[data-slot=slider-range]]:bg-[var(--primary)] [&_[data-slot=slider-thumb]]:border-[var(--primary)]"
      />
      <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{formatCurrency(min * 100)}</span>
        <span>{formatCurrency(max * 100)}+</span>
      </div>
      <FieldHelp field={field} id={describedBy} />
    </div>
  )
}

function FieldLabel({
  field,
  htmlFor,
}: {
  field: FormField
  htmlFor: string
}) {
  return (
    <Label htmlFor={htmlFor} className="text-sm font-medium">
      {field.label}
      {field.required ? (
        <span className="text-[var(--primary)]"> *</span>
      ) : null}
    </Label>
  )
}

function FieldHelp({ field, id }: { field: FormField; id?: string }) {
  if (!field.help) return null
  return (
    <p id={id} className="text-xs text-muted-foreground">
      {field.help}
    </p>
  )
}
