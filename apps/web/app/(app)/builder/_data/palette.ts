import {
  CheckSquareIcon,
  GalleryVerticalEndIcon,
  HashIcon,
  ImageIcon,
  type LucideIcon,
  MailIcon,
  MousePointerClickIcon,
  PhoneIcon,
  QuoteIcon,
  RowsIcon,
  SlidersHorizontalIcon,
  SquarePenIcon,
  TextIcon,
  TypeIcon,
} from "lucide-react"

import type { BlockType, FieldType } from "./types"

/**
 * Itens da BlockPalette (lado esquerdo). Cada item gera um bloco ao clicar.
 * "Campo" tem subtipos que viram campos dentro do bloco de Formulário
 * selecionado (ou criam um formulário se não houver nenhum).
 */

export interface BlockPaletteItem {
  type: BlockType
  label: string
  hint: string
  icon: LucideIcon
}

export interface FieldPaletteItem {
  type: FieldType
  label: string
  icon: LucideIcon
}

export interface PaletteGroup {
  id: string
  label: string
  blocks: BlockPaletteItem[]
}

export const PALETTE_GROUPS: PaletteGroup[] = [
  {
    id: "secoes",
    label: "Seções",
    blocks: [
      {
        type: "hero",
        label: "Hero",
        hint: "Título + capa",
        icon: GalleryVerticalEndIcon,
      },
      {
        type: "texto",
        label: "Texto",
        hint: "Parágrafo rico",
        icon: TextIcon,
      },
      {
        type: "imagem",
        label: "Imagem",
        hint: "Foto + legenda",
        icon: ImageIcon,
      },
      {
        type: "depoimento",
        label: "Depoimento",
        hint: "Prova social",
        icon: QuoteIcon,
      },
      {
        type: "espacador",
        label: "Espaçador",
        hint: "Respiro vertical",
        icon: RowsIcon,
      },
    ],
  },
  {
    id: "conversao",
    label: "Conversão",
    blocks: [
      {
        type: "formulario",
        label: "Formulário",
        hint: "Captura de leads",
        icon: SquarePenIcon,
      },
      {
        type: "cta",
        label: "Botão / CTA",
        hint: "Ação principal",
        icon: MousePointerClickIcon,
      },
    ],
  },
]

/** Subtipos de campo (adicionados ao formulário). */
export const FIELD_PALETTE: FieldPaletteItem[] = [
  { type: "texto", label: "Texto", icon: TypeIcon },
  { type: "email", label: "Email", icon: MailIcon },
  { type: "telefone", label: "Telefone", icon: PhoneIcon },
  { type: "selecao", label: "Seleção", icon: HashIcon },
  { type: "checkbox", label: "Checkbox", icon: CheckSquareIcon },
  { type: "slider", label: "Slider", icon: SlidersHorizontalIcon },
]
