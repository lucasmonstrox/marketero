import type {
  Block,
  BlockType,
  FieldType,
  FormField,
  FormularioBlock,
} from "./types"

/** Gera um id curto e único para blocos/campos (suficiente para estado local). */
export function uid(prefix = "b"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

/* ------------------------------- Campos ---------------------------------- */

const FIELD_LABELS: Record<FieldType, string> = {
  texto: "Campo de texto",
  email: "Email",
  telefone: "Telefone",
  selecao: "Interesse",
  checkbox: "Aceito receber novidades",
  slider: "Orçamento",
}

export function createField(type: FieldType): FormField {
  const base: FormField = {
    id: uid("f"),
    type,
    label: FIELD_LABELS[type],
    required: type !== "checkbox" && type !== "slider",
  }

  if (type === "texto") {
    return { ...base, label: "Nome completo", placeholder: "Ex.: Maria Silva" }
  }
  if (type === "email") {
    return { ...base, placeholder: "voce@email.com.br" }
  }
  if (type === "telefone") {
    return { ...base, placeholder: "(11) 90000-0000" }
  }
  if (type === "selecao") {
    return {
      ...base,
      placeholder: "Selecione...",
      options: ["Sala de estar", "Quarto", "Cozinha", "Home office"],
    }
  }
  if (type === "slider") {
    return {
      ...base,
      min: 500,
      max: 10000,
      step: 500,
      help: "Arraste para indicar seu orçamento aproximado.",
    }
  }
  // checkbox
  return { ...base }
}

/* ------------------------------- Blocos ---------------------------------- */

export function createBlock(type: BlockType): Block {
  switch (type) {
    case "hero":
      return {
        id: uid("hero"),
        type: "hero",
        eyebrow: "Bella Decor",
        title: "Deixe sua casa com a sua cara",
        subtitle:
          "Receba dicas de decoração e ofertas exclusivas direto no seu e-mail.",
        coverLabel: "Imagem de capa (1200×600)",
      }
    case "texto":
      return {
        id: uid("txt"),
        type: "texto",
        heading: "Por que escolher a Bella Decor",
        body: "Curadoria de móveis e objetos de decoração para todos os ambientes, com entrega para todo o Brasil e parcelamento facilitado.",
      }
    case "imagem":
      return {
        id: uid("img"),
        type: "imagem",
        alt: "Ambiente de sala decorado pela Bella Decor",
        caption: "Coleção Primavera 2026",
        ratio: "16/9",
      }
    case "formulario":
      return createFormBlock()
    case "cta":
      return {
        id: uid("cta"),
        type: "cta",
        label: "Quero conhecer a loja",
        href: "/campanhas",
        variant: "solido",
      }
    case "depoimento":
      return {
        id: uid("dep"),
        type: "depoimento",
        quote:
          "Montei minha sala inteira com a Bella Decor. Atendimento impecável e o cupom de boas-vindas fez toda a diferença!",
        author: "Juliana Prado",
        role: "Cliente · São Paulo, SP",
        rating: 5,
      }
    case "espacador":
      return { id: uid("sp"), type: "espacador", size: "md" }
  }
}

export function createFormBlock(): FormularioBlock {
  return {
    id: uid("form"),
    type: "formulario",
    title: "Receba 10% off no seu primeiro pedido",
    description:
      "Cadastre-se e enviaremos seu cupom de boas-vindas na hora, junto das novidades da loja.",
    fields: [
      createField("texto"),
      createField("email"),
      createField("telefone"),
      createField("selecao"),
      createField("slider"),
    ],
    consentLabel:
      "Concordo em receber comunicações da Bella Decor e com a Política de Privacidade (LGPD).",
    antiSpam: true,
    submitLabel: "Quero meu cupom",
  }
}

/* --------------------------- Página inicial ------------------------------ */

/** Página de exemplo já montada (Hero → Formulário → Depoimento). */
export function createInitialBlocks(): Block[] {
  return [createBlock("hero"), createFormBlock(), createBlock("depoimento")]
}
