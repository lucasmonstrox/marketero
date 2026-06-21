/**
 * Modelo de dados do builder de páginas/formulários (design-system §7.5).
 * Tudo é estado local (useState) — UI-only, sem persistência. Os blocos são
 * uma lista plana ordenada; o bloco de Formulário guarda seus campos aninhados.
 */

export type BlockType =
  | "hero"
  | "texto"
  | "imagem"
  | "formulario"
  | "cta"
  | "depoimento"
  | "espacador"

/** Subtipos de campo do formulário (paleta "Campo"). */
export type FieldType =
  | "texto"
  | "email"
  | "telefone"
  | "selecao"
  | "checkbox"
  | "slider"

export interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  required: boolean
  /** Opções para `selecao`. */
  options?: string[]
  /** Faixa para `slider` (em reais, só visual). */
  min?: number
  max?: number
  step?: number
  /** Texto auxiliar abaixo do campo. */
  help?: string
}

interface BaseBlock {
  id: string
  type: BlockType
}

export interface HeroBlock extends BaseBlock {
  type: "hero"
  eyebrow: string
  title: string
  subtitle: string
  /** rótulo do "cover" — placeholder visual, sem upload real. */
  coverLabel: string
}

export interface TextoBlock extends BaseBlock {
  type: "texto"
  heading: string
  body: string
}

export interface ImagemBlock extends BaseBlock {
  type: "imagem"
  alt: string
  caption: string
  ratio: "16/9" | "4/3" | "1/1"
}

export interface FormularioBlock extends BaseBlock {
  type: "formulario"
  title: string
  description: string
  fields: FormField[]
  consentLabel: string
  /** Mostrar o box anti-spam (Turnstile placeholder). */
  antiSpam: boolean
  submitLabel: string
}

export interface CtaBlock extends BaseBlock {
  type: "cta"
  label: string
  href: string
  variant: "solido" | "contorno"
}

export interface DepoimentoBlock extends BaseBlock {
  type: "depoimento"
  quote: string
  author: string
  role: string
  rating: number
}

export interface EspacadorBlock extends BaseBlock {
  type: "espacador"
  size: "sm" | "md" | "lg"
}

export type Block =
  | HeroBlock
  | TextoBlock
  | ImagemBlock
  | FormularioBlock
  | CtaBlock
  | DepoimentoBlock
  | EspacadorBlock

/* ------------------------------- Tema/tenant ------------------------------ */

/** Preset de cor de marca — o `value` é OKLCH (DADO do tenant, não cor de UI). */
export interface BrandPreset {
  id: string
  label: string
  /** valor concreto OKLCH aplicado a `--primary` no escopo `[data-tenant]`. */
  value: string
}

export interface FontOption {
  id: string
  label: string
  /** font-family stack injetada em `--font-sans` do preview. */
  stack: string
}

export interface TenantTheme {
  /** OKLCH da cor primária do tenant (aplicada via CSS var). */
  primary: string
  /** raio base em rem, vira `--radius`. */
  radius: number
  /** stack de fonte do preview, vira `--font-sans`. */
  font: string
}

export type DeviceMode = "desktop" | "mobile"
export type DeliveryMode = "hosted" | "embed"
