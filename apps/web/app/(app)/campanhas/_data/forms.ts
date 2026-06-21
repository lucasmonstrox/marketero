import type { SemanticTone } from "@/shared/domain/taxonomy"

/**
 * Mock dos Forms da "Bella Decor" (agentes.md §9). O Form é o "programa": o
 * conjunto de perguntas (`questions`) + consentimento. Pode espelhar um Instant
 * Form da Meta (`metaFormId` presente) ou viver só na plataforma.
 *
 * UI-only — dados fictícios colocados aqui de propósito.
 */

/** Tipos de campo suportados na compilação Form → FSM (agentes.md §4). */
export type FieldType =
  | "TEXT"
  | "EMAIL"
  | "PHONE"
  | "ID_CPF"
  | "SLIDER"
  | "SELECT"
  | "DATE_TIME"

export interface FieldTypeMeta {
  id: FieldType
  label: string
  /** Validação/normalização que a FSM aplica (agentes.md §3 validate). */
  hint: string
}

export const FIELD_TYPE_META: Record<FieldType, FieldTypeMeta> = {
  TEXT: { id: "TEXT", label: "Texto", hint: "Texto livre" },
  EMAIL: { id: "EMAIL", label: "E-mail", hint: "Validação por regex" },
  PHONE: { id: "PHONE", label: "Telefone", hint: "Normaliza para E.164 (+55)" },
  ID_CPF: { id: "ID_CPF", label: "CPF", hint: "Dígito verificador" },
  SLIDER: { id: "SLIDER", label: "Faixa", hint: "Valor numérico em intervalo" },
  SELECT: { id: "SELECT", label: "Escolha", hint: "Opções pré-definidas" },
  DATE_TIME: { id: "DATE_TIME", label: "Data/hora", hint: "Agendamento" },
}

export type FormStatus = "draft" | "active" | "archived"

export const FORM_STATUS_META: Record<
  FormStatus,
  { label: string; tone: SemanticTone }
> = {
  draft: { label: "Rascunho", tone: "muted" },
  active: { label: "Ativo", tone: "success" },
  archived: { label: "Arquivado", tone: "muted" },
}

export interface FormQuestion {
  key: string
  label: string
  type: FieldType
  required: boolean
}

export interface FormConsent {
  /** Texto do disclaimer (LGPD). */
  disclaimer: string
  /** Aceite obrigatório vira gate duro antes de `complete` (agentes.md §3). */
  required: boolean
}

export interface Form {
  id: string
  name: string
  description: string
  questions: FormQuestion[]
  consent: FormConsent
  status: FormStatus
  /** Vínculo com Instant Form da Meta — `null` = só plataforma (agentes.md §9). */
  metaFormId: string | null
  updatedAt: string
}

export const FORMS: Form[] = [
  {
    id: "form-sob-medida",
    name: "Orçamento de móveis sob medida",
    description:
      "Captura de leads de alta intenção para projetos de marcenaria planejada.",
    questions: [
      { key: "nome", label: "Como podemos te chamar?", type: "TEXT", required: true },
      { key: "email", label: "Seu melhor e-mail", type: "EMAIL", required: true },
      { key: "telefone", label: "WhatsApp para contato", type: "PHONE", required: true },
      {
        key: "ambiente",
        label: "Qual ambiente você quer planejar?",
        type: "SELECT",
        required: true,
      },
      {
        key: "orcamento",
        label: "Faixa de investimento prevista",
        type: "SLIDER",
        required: true,
      },
    ],
    consent: {
      disclaimer:
        "Autorizo a Bella Decor a usar meus dados para envio do orçamento e contato comercial.",
      required: true,
    },
    status: "active",
    metaFormId: "META-LF-908112",
    updatedAt: "2026-06-18T14:30:00",
  },
  {
    id: "form-consultoria",
    name: "Consultoria de decoração",
    description:
      "Agendamento de consultoria gratuita com nossa equipe de designers.",
    questions: [
      { key: "nome", label: "Seu nome completo", type: "TEXT", required: true },
      { key: "telefone", label: "Telefone com DDD", type: "PHONE", required: true },
      {
        key: "estilo",
        label: "Qual estilo combina com você?",
        type: "SELECT",
        required: true,
      },
      {
        key: "data_visita",
        label: "Melhor data para a visita",
        type: "DATE_TIME",
        required: false,
      },
    ],
    consent: {
      disclaimer:
        "Concordo em receber contato da Bella Decor sobre o agendamento da consultoria.",
      required: true,
    },
    status: "active",
    metaFormId: "META-LF-908340",
    updatedAt: "2026-06-15T09:10:00",
  },
  {
    id: "form-mega-saldao",
    name: "Lista VIP do Mega Saldão",
    description:
      "Cadastro rápido para avisos da liquidação de fim de coleção.",
    questions: [
      { key: "nome", label: "Seu primeiro nome", type: "TEXT", required: true },
      { key: "email", label: "E-mail para os avisos", type: "EMAIL", required: true },
      {
        key: "interesse",
        label: "Categoria favorita",
        type: "SELECT",
        required: false,
      },
    ],
    consent: {
      disclaimer:
        "Aceito receber ofertas e novidades da Bella Decor por e-mail e WhatsApp.",
      required: true,
    },
    status: "active",
    metaFormId: null,
    updatedAt: "2026-06-19T17:45:00",
  },
  {
    id: "form-pos-venda",
    name: "Pesquisa pós-entrega",
    description:
      "Coleta de satisfação após a montagem dos móveis na casa do cliente.",
    questions: [
      { key: "nome", label: "Seu nome", type: "TEXT", required: true },
      { key: "cpf", label: "CPF do pedido", type: "ID_CPF", required: true },
      {
        key: "nota",
        label: "De 0 a 10, qual sua satisfação?",
        type: "SLIDER",
        required: true,
      },
      { key: "comentario", label: "Quer deixar um comentário?", type: "TEXT", required: false },
    ],
    consent: {
      disclaimer:
        "Autorizo o uso do meu feedback para melhoria dos produtos e serviços.",
      required: false,
    },
    status: "draft",
    metaFormId: null,
    updatedAt: "2026-06-20T11:20:00",
  },
  {
    id: "form-natal-2025",
    name: "Coleção de Natal 2025",
    description: "Campanha sazonal encerrada — mantida para histórico.",
    questions: [
      { key: "nome", label: "Seu nome", type: "TEXT", required: true },
      { key: "email", label: "Seu e-mail", type: "EMAIL", required: true },
    ],
    consent: {
      disclaimer: "Aceito receber ofertas de Natal da Bella Decor.",
      required: true,
    },
    status: "archived",
    metaFormId: "META-LF-771203",
    updatedAt: "2025-12-28T08:00:00",
  },
]

export function getForm(id: string): Form | undefined {
  return FORMS.find((form) => form.id === id)
}
