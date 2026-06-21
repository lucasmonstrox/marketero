"use client"

import {
  ImageIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { FieldRenderer } from "./field-renderer"
import type {
  CtaBlock,
  DepoimentoBlock,
  EspacadorBlock,
  FormularioBlock,
  HeroBlock,
  ImagemBlock,
  TextoBlock,
} from "../_data/types"

/**
 * Renderizadores dos blocos no PREVIEW white-label (Eixo B). Tudo aqui lê as
 * variáveis do tenant herdadas do escopo `[data-tenant]`: `var(--primary)`,
 * `var(--radius)`, `var(--font-sans)`. Trocar a marca no inspector re-tematiza
 * estes blocos ao vivo. Densidade confortável — é vitrine, não operação.
 */

const SPACER_SIZE: Record<EspacadorBlock["size"], string> = {
  sm: "h-6",
  md: "h-12",
  lg: "h-20",
}

export function HeroBlockView({ block }: { block: HeroBlock }) {
  return (
    <header className="flex flex-col items-center gap-5 px-6 py-10 text-center sm:px-10 sm:py-14">
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[var(--primary)] uppercase">
        <SparklesIcon className="size-3.5" />
        {block.eyebrow}
      </span>
      <h1 className="max-w-2xl text-3xl leading-tight font-semibold text-balance text-foreground sm:text-4xl">
        {block.title}
      </h1>
      <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
        {block.subtitle}
      </p>
      <div
        className="mt-2 grid w-full max-w-2xl place-items-center gap-2 rounded-[var(--radius)] border border-dashed border-[var(--primary)]/30 bg-[var(--primary)]/5 py-12 text-[var(--primary)]"
        role="img"
        aria-label={block.coverLabel}
      >
        <ImageIcon className="size-7 opacity-70" />
        <span className="text-xs font-medium opacity-80">
          {block.coverLabel}
        </span>
      </div>
    </header>
  )
}

export function TextoBlockView({ block }: { block: TextoBlock }) {
  return (
    <section className="flex flex-col gap-2.5 px-6 py-6 sm:px-10">
      <h2 className="text-xl font-semibold text-foreground">{block.heading}</h2>
      <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
        {block.body}
      </p>
    </section>
  )
}

export function ImagemBlockView({ block }: { block: ImagemBlock }) {
  return (
    <figure className="flex flex-col gap-2 px-6 py-4 sm:px-10">
      <div
        className="grid place-items-center overflow-hidden rounded-[var(--radius)] border bg-muted"
        style={{ aspectRatio: block.ratio.replace("/", " / ") }}
        role="img"
        aria-label={block.alt}
      >
        <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
          <ImageIcon className="size-7 opacity-60" />
          <span className="text-xs">{block.alt}</span>
        </div>
      </div>
      {block.caption ? (
        <figcaption className="text-center text-xs text-muted-foreground">
          {block.caption}
        </figcaption>
      ) : null}
    </figure>
  )
}

export function CtaBlockView({ block }: { block: CtaBlock }) {
  const solid = block.variant === "solido"
  return (
    <div className="flex justify-center px-6 py-5 sm:px-10">
      <span
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-[var(--radius)] px-6 text-sm font-semibold transition-colors",
          solid
            ? "bg-[var(--primary)] text-white shadow-sm"
            : "border-2 border-[var(--primary)] bg-transparent text-[var(--primary)]"
        )}
      >
        {block.label}
      </span>
    </div>
  )
}

export function DepoimentoBlockView({ block }: { block: DepoimentoBlock }) {
  return (
    <section className="px-6 py-6 sm:px-10">
      <figure className="flex flex-col items-center gap-4 rounded-[var(--radius)] border bg-card px-6 py-8 text-center">
        <div className="flex gap-0.5" aria-label={`Avaliação ${block.rating} de 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <StarIcon
              key={i}
              className={cn(
                "size-4",
                i < block.rating
                  ? "fill-[var(--primary)] text-[var(--primary)]"
                  : "text-muted-foreground/40"
              )}
            />
          ))}
        </div>
        <blockquote className="max-w-xl text-lg leading-relaxed text-pretty text-foreground">
          “{block.quote}”
        </blockquote>
        <figcaption className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-semibold text-foreground">
            {block.author}
          </span>
          <span className="text-xs text-muted-foreground">{block.role}</span>
        </figcaption>
      </figure>
    </section>
  )
}

export function EspacadorBlockView({ block }: { block: EspacadorBlock }) {
  return (
    <div
      className={cn("w-full", SPACER_SIZE[block.size])}
      aria-hidden
    />
  )
}

export function FormularioBlockView({ block }: { block: FormularioBlock }) {
  return (
    <section className="px-6 py-6 sm:px-10">
      <div className="mx-auto flex max-w-lg flex-col gap-5 rounded-[var(--radius)] border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-xl font-semibold text-foreground">
            {block.title}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {block.description}
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          {block.fields.length === 0 ? (
            <p className="rounded-[var(--radius)] border border-dashed bg-muted/40 p-4 text-center text-xs text-muted-foreground">
              Sem campos. Use a paleta "Campos" à esquerda para adicionar.
            </p>
          ) : (
            block.fields.map((field) => (
              <FieldRenderer key={field.id} field={field} />
            ))
          )}

          {/* Consentimento LGPD (obrigatório) */}
          <div className="flex items-start gap-2.5 rounded-[var(--radius)] bg-muted/40 p-3">
            <input
              id={`consent-${block.id}`}
              type="checkbox"
              required
              className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
            />
            <label
              htmlFor={`consent-${block.id}`}
              className="text-xs leading-snug text-muted-foreground"
            >
              {block.consentLabel}
              <span className="text-[var(--primary)]"> *</span>
            </label>
          </div>

          {/* Anti-spam (Turnstile placeholder) */}
          {block.antiSpam ? (
            <div className="flex items-center gap-3 rounded-[var(--radius)] border border-dashed bg-background p-3">
              <div className="grid size-7 shrink-0 place-items-center rounded-md bg-muted">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">
                  Verificação anti-spam
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Cloudflare Turnstile (placeholder)
                </span>
              </div>
              <span className="ml-auto inline-flex size-4 items-center justify-center rounded-full border border-muted-foreground/30" />
            </div>
          ) : null}

          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-6 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            {block.submitLabel}
          </button>

          <p className="text-center text-[11px] text-muted-foreground">
            Seus dados estão protegidos. Leia nossa Política de Privacidade.
          </p>
        </form>
      </div>
    </section>
  )
}
