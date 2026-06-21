import type { Channel } from "@/shared/domain/channels"
import type { Intent } from "@/shared/domain/taxonomy"

/**
 * Dados mock do Inbox unificado (UI-only). Mundo fictício: tenant "Bella Decor"
 * (decoração/móveis BR), operadora Ana Souza. Valores em BRL (centavos),
 * telefones em E.164, timestamps recentes relativos a 21/06/2026.
 *
 * Tudo aqui é colocado para a rota — nenhum backend. As mensagens misturam DMs
 * e comentários de vários canais, com respostas automatizadas do agente
 * GraphRAG (AIReply) e sugestões pendentes de revisão humana.
 */

/** Quem emitiu a mensagem dentro de uma conversa. */
export type MessageAuthor = "contact" | "human" | "ai"

/** Tipo de evento de origem: DM privada ou comentário público. */
export type SourceKind = "dm" | "comment"

export interface ProductRef {
  id: string
  name: string
  /** Preço em centavos (padrão do schema value_cents). */
  priceCents: number
}

export interface Message {
  id: string
  author: MessageAuthor
  body: string
  /** ISO 8601. */
  at: string
  /** Operadora humana que enviou (author === "human"). */
  agentName?: string
  /** Confiança do GraphRAG quando author === "ai" (fração 0–1). */
  confidence?: number
}

/** Sugestão de resposta gerada pelo GraphRAG, pendente de ação humana. */
export interface SuggestedReply {
  body: string
  /** Fração 0–1 — alimenta confidenceBand(). */
  confidence: number
  /** Fontes do grafo de conhecimento citadas na geração. */
  sources: string[]
  /** Produtos que o grafo sugere anexar à resposta. */
  suggestedProducts: ProductRef[]
}

export interface ContactHistory {
  leads: number
  orders: number
  /** Valor total comprado, em centavos. */
  totalSpentCents: number
  /** Ticket médio em centavos. */
  avgTicketCents: number
  firstSeenAt: string
}

export interface Contact {
  name: string
  /** Telefone em E.164. */
  phone: string
  email: string
  location: string
  tags: string[]
  history: ContactHistory
  /** Produtos recomendados pelo grafo para este contato. */
  graphProducts: ProductRef[]
  campaign: { name: string; channel: Channel }
  consent: {
    optIn: boolean
    /** Base/canal do consentimento LGPD. */
    basis: string
    at: string
  }
}

export interface Conversation {
  id: string
  channel: Channel
  source: SourceKind
  contact: Contact
  /** Classificação de IA do último evento (pode faltar p/ não classificado). */
  intent?: Intent
  unread: boolean
  /** Conversa já resolvida pelo time/agente. */
  resolved: boolean
  status: "aberta" | "aguardando_cliente" | "resolvida"
  messages: Message[]
  /** Sugestão pendente do GraphRAG, quando houver. */
  suggestedReply?: SuggestedReply
}

/* --------------------------------- Helpers -------------------------------- */

/** Iniciais para o Avatar (máx. 2). */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

/** Última mensagem da conversa (para preview da lista). */
export function lastMessage(conversation: Conversation): Message {
  return conversation.messages[conversation.messages.length - 1] as Message
}

/* ------------------------------- Mock world ------------------------------- */

export const OPERATOR_NAME = "Ana Souza"
export const TENANT_NAME = "Bella Decor"

export const CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    channel: "whatsapp",
    source: "dm",
    intent: "intencao_de_compra",
    unread: true,
    resolved: false,
    status: "aberta",
    contact: {
      name: "Mariana Albuquerque",
      phone: "+55 11 98432-1190",
      email: "mariana.albuquerque@gmail.com",
      location: "São Paulo, SP",
      tags: ["VIP", "Recompra", "Sala de estar"],
      history: {
        leads: 3,
        orders: 2,
        totalSpentCents: 658700,
        avgTicketCents: 329350,
        firstSeenAt: "2025-11-08T10:00:00-03:00",
      },
      graphProducts: [
        { id: "p-sofa-retratil", name: "Sofá retrátil Lisboa 2,40m", priceCents: 489900 },
        { id: "p-mesa-centro", name: "Mesa de centro Off-White Carrara", priceCents: 119900 },
        { id: "p-tapete", name: "Tapete felpudo 2,00x2,50m", priceCents: 79900 },
      ],
      campaign: { name: "Inverno Aconchegante 2026", channel: "instagram" },
      consent: {
        optIn: true,
        basis: "Opt-in via WhatsApp Business",
        at: "2026-06-19T09:12:00-03:00",
      },
    },
    messages: [
      {
        id: "m1",
        author: "contact",
        body: "Oi! Vi o sofá retrátil de vocês no Instagram e me apaixonei. Vocês entregam em SP capital?",
        at: "2026-06-21T13:40:00-03:00",
      },
      {
        id: "m2",
        author: "ai",
        body: "Oi, Mariana! Que bom que gostou 😊 Sim, entregamos em toda a Grande São Paulo. O Sofá retrátil Lisboa 2,40m custa R$ 4.899,00 em até 10x sem juros. Quer que eu verifique o prazo de entrega para o seu CEP?",
        at: "2026-06-21T13:41:00-03:00",
        confidence: 0.91,
      },
      {
        id: "m3",
        author: "contact",
        body: "Quero sim! Meu CEP é 01310-100. E vocês têm na cor cinza?",
        at: "2026-06-21T13:44:00-03:00",
      },
    ],
    suggestedReply: {
      body: "Temos sim na cor cinza grafite, Mariana! Para o CEP 01310-100 o prazo é de 7 dias úteis e o frete sai por R$ 149,00. Posso já reservar uma unidade para você?",
      confidence: 0.88,
      sources: [
        "Catálogo › Sofá Lisboa (variações de cor)",
        "Tabela de frete › SP capital",
        "Pedido anterior #4471 (perfil de compra)",
      ],
      suggestedProducts: [
        { id: "p-sofa-retratil", name: "Sofá retrátil Lisboa 2,40m — Cinza grafite", priceCents: 489900 },
        { id: "p-puff", name: "Puff baú Lisboa (combina com o sofá)", priceCents: 64900 },
      ],
    },
  },
  {
    id: "c2",
    channel: "instagram",
    source: "comment",
    intent: "duvida",
    unread: true,
    resolved: false,
    status: "aberta",
    contact: {
      name: "Rafael Teixeira",
      phone: "+55 21 99711-4820",
      email: "rafa.teixeira@hotmail.com",
      location: "Niterói, RJ",
      tags: ["Primeiro contato", "Home office"],
      history: {
        leads: 1,
        orders: 0,
        totalSpentCents: 0,
        avgTicketCents: 0,
        firstSeenAt: "2026-06-20T18:30:00-03:00",
      },
      graphProducts: [
        { id: "p-escrivaninha", name: "Escrivaninha Oslo 1,20m", priceCents: 89900 },
        { id: "p-cadeira", name: "Cadeira ergonômica Bordô", priceCents: 134900 },
      ],
      campaign: { name: "Coleção Home Office", channel: "instagram" },
      consent: {
        optIn: false,
        basis: "Comentário público (sem opt-in de DM)",
        at: "2026-06-20T18:30:00-03:00",
      },
    },
    messages: [
      {
        id: "m1",
        author: "contact",
        body: "Essa escrivaninha cabe em quanto de espaço? Tenho um cantinho de 1,30m",
        at: "2026-06-21T12:05:00-03:00",
      },
    ],
    suggestedReply: {
      body: "Oi, Rafael! A Escrivaninha Oslo tem 1,20m de largura, então encaixa certinho no seu cantinho de 1,30m e ainda sobra folga. Quer que eu te mande o link com as medidas completas no direct?",
      confidence: 0.74,
      sources: [
        "Catálogo › Escrivaninha Oslo (ficha técnica)",
        "FAQ › Medidas e ambientação",
      ],
      suggestedProducts: [
        { id: "p-escrivaninha", name: "Escrivaninha Oslo 1,20m", priceCents: 89900 },
      ],
    },
  },
  {
    id: "c3",
    channel: "mercadolivre",
    source: "comment",
    intent: "reclamacao",
    unread: true,
    resolved: false,
    status: "aberta",
    contact: {
      name: "Patrícia Gomes",
      phone: "+55 31 98220-7733",
      email: "patricia.gomes88@gmail.com",
      location: "Belo Horizonte, MG",
      tags: ["Pós-venda", "Pedido #4502"],
      history: {
        leads: 2,
        orders: 1,
        totalSpentCents: 219900,
        avgTicketCents: 219900,
        firstSeenAt: "2026-04-15T14:00:00-03:00",
      },
      graphProducts: [
        { id: "p-kit-reparo", name: "Kit de reparo para estofados", priceCents: 8900 },
      ],
      campaign: { name: "Mega Promo Móveis", channel: "mercadolivre" },
      consent: {
        optIn: true,
        basis: "Opt-in via Mercado Livre Mensagens",
        at: "2026-04-15T14:02:00-03:00",
      },
    },
    messages: [
      {
        id: "m1",
        author: "contact",
        body: "A poltrona chegou com um arranhão no braço direito. Estou bem frustrada, paguei caro nisso.",
        at: "2026-06-21T11:20:00-03:00",
      },
      {
        id: "m2",
        author: "ai",
        body: "Sinto muito pelo ocorrido, Patrícia. Isso não é o padrão da Bella Decor e vamos resolver. Vou acionar a troca do item — você prefere reposição ou reembolso parcial?",
        at: "2026-06-21T11:22:00-03:00",
        confidence: 0.69,
      },
    ],
    suggestedReply: {
      body: "Já abri o protocolo de troca #TR-2208 e a coleta é gratuita. A nova poltrona chega em até 5 dias úteis. Como pedido de desculpas, incluí um cupom de R$ 80,00 para sua próxima compra. Tudo bem assim?",
      confidence: 0.61,
      sources: [
        "Pedido #4502 (status entrega)",
        "Política de trocas e devoluções",
        "Régua de retenção pós-venda",
      ],
      suggestedProducts: [],
    },
  },
  {
    id: "c4",
    channel: "facebook",
    source: "comment",
    intent: "elogio",
    unread: false,
    resolved: true,
    status: "resolvida",
    contact: {
      name: "Carlos Mendonça",
      phone: "+55 41 99645-2210",
      email: "carlosmendonca@yahoo.com.br",
      location: "Curitiba, PR",
      tags: ["Cliente fiel", "Promotor"],
      history: {
        leads: 4,
        orders: 3,
        totalSpentCents: 712800,
        avgTicketCents: 237600,
        firstSeenAt: "2025-08-22T16:00:00-03:00",
      },
      graphProducts: [
        { id: "p-estante", name: "Estante modular Bergen", priceCents: 159900 },
      ],
      campaign: { name: "Indique e Ganhe", channel: "facebook" },
      consent: {
        optIn: true,
        basis: "Opt-in via Facebook Messenger",
        at: "2025-08-22T16:05:00-03:00",
      },
    },
    messages: [
      {
        id: "m1",
        author: "contact",
        body: "Gente, a estante Bergen ficou um espetáculo na minha sala! Montagem super fácil. Recomendo demais 👏",
        at: "2026-06-21T09:10:00-03:00",
      },
      {
        id: "m2",
        author: "ai",
        body: "Que alegria ler isso, Carlos! 🥰 Muito obrigada pela confiança de sempre. Se topar, adoraríamos repostar sua sala nos nossos stories — pode ser?",
        at: "2026-06-21T09:12:00-03:00",
        confidence: 0.93,
      },
      {
        id: "m3",
        author: "contact",
        body: "Claro, pode usar à vontade! 😄",
        at: "2026-06-21T09:30:00-03:00",
      },
      {
        id: "m4",
        author: "human",
        body: "Maravilha, Carlos! Já marquei aqui. Muito obrigada por divulgar a Bella Decor 💜",
        at: "2026-06-21T09:35:00-03:00",
        agentName: "Ana Souza",
      },
    ],
  },
  {
    id: "c5",
    channel: "instagram",
    source: "dm",
    intent: "intencao_de_compra",
    unread: false,
    resolved: false,
    status: "aguardando_cliente",
    contact: {
      name: "Juliana Prado",
      phone: "+55 51 99188-3477",
      email: "ju.prado@gmail.com",
      location: "Porto Alegre, RS",
      tags: ["Quarto", "Lista de desejos"],
      history: {
        leads: 2,
        orders: 1,
        totalSpentCents: 329900,
        avgTicketCents: 329900,
        firstSeenAt: "2026-02-10T11:00:00-03:00",
      },
      graphProducts: [
        { id: "p-cabeceira", name: "Cabeceira estofada Verona Queen", priceCents: 134900 },
        { id: "p-criado", name: "Par de criados-mudos Verona", priceCents: 89900 },
      ],
      campaign: { name: "Quarto dos Sonhos", channel: "instagram" },
      consent: {
        optIn: true,
        basis: "Opt-in via Instagram Direct",
        at: "2026-06-18T20:15:00-03:00",
      },
    },
    messages: [
      {
        id: "m1",
        author: "contact",
        body: "Adorei a cabeceira Verona! Vocês têm na medida King também?",
        at: "2026-06-21T08:02:00-03:00",
      },
      {
        id: "m2",
        author: "ai",
        body: "Oi, Juliana! Temos sim a Verona em King (1,93m). Sai por R$ 1.549,00 em até 10x. Quer que eu separe junto com o par de criados-mudos que combina?",
        at: "2026-06-21T08:03:00-03:00",
        confidence: 0.86,
      },
      {
        id: "m3",
        author: "human",
        body: "Oi Juliana, aqui é a Ana 💜 Consigo um brinde de almofadas se você fechar o conjunto hoje. Posso reservar?",
        at: "2026-06-21T08:20:00-03:00",
        agentName: "Ana Souza",
      },
    ],
  },
  {
    id: "c6",
    channel: "whatsapp",
    source: "dm",
    intent: "suporte",
    unread: false,
    resolved: false,
    status: "aberta",
    contact: {
      name: "Eduardo Nunes",
      phone: "+55 81 99523-6644",
      email: "eduardo.nunes@outlook.com",
      location: "Recife, PE",
      tags: ["Montagem", "Pedido #4488"],
      history: {
        leads: 1,
        orders: 1,
        totalSpentCents: 159900,
        avgTicketCents: 159900,
        firstSeenAt: "2026-05-30T13:00:00-03:00",
      },
      graphProducts: [
        { id: "p-manual", name: "Agendamento de montagem profissional", priceCents: 12900 },
      ],
      campaign: { name: "Pós-compra Automático", channel: "whatsapp" },
      consent: {
        optIn: true,
        basis: "Opt-in via WhatsApp Business",
        at: "2026-05-30T13:05:00-03:00",
      },
    },
    messages: [
      {
        id: "m1",
        author: "contact",
        body: "Recebi a estante mas estou com dúvida na hora de montar a terceira prateleira. Tem manual em PDF?",
        at: "2026-06-20T19:40:00-03:00",
      },
      {
        id: "m2",
        author: "ai",
        body: "Claro, Eduardo! Já te enviei o manual em PDF da estante Bergen aqui no WhatsApp. A prateleira do meio usa os parafusos do saquinho B. Se preferir, posso agendar uma montagem profissional por R$ 129,00. Quer?",
        at: "2026-06-20T19:42:00-03:00",
        confidence: 0.83,
      },
      {
        id: "m3",
        author: "contact",
        body: "Acho que consigo sozinho, obrigado! Vou tentar agora.",
        at: "2026-06-20T19:50:00-03:00",
      },
    ],
  },
  {
    id: "c7",
    channel: "web",
    source: "dm",
    intent: "duvida",
    unread: false,
    resolved: false,
    status: "aberta",
    contact: {
      name: "Fernanda Lima",
      phone: "+55 62 99877-1205",
      email: "fernanda.lima@gmail.com",
      location: "Goiânia, GO",
      tags: ["Chat do site", "Decoração completa"],
      history: {
        leads: 1,
        orders: 0,
        totalSpentCents: 0,
        avgTicketCents: 0,
        firstSeenAt: "2026-06-21T07:15:00-03:00",
      },
      graphProducts: [
        { id: "p-consultoria", name: "Consultoria de decoração online", priceCents: 19900 },
        { id: "p-combo-sala", name: "Combo Sala Completa Lisboa", priceCents: 689900 },
      ],
      campaign: { name: "Visitantes do Site", channel: "web" },
      consent: {
        optIn: true,
        basis: "Opt-in via chat do site (LGPD)",
        at: "2026-06-21T07:16:00-03:00",
      },
    },
    messages: [
      {
        id: "m1",
        author: "contact",
        body: "Estou montando minha primeira casa e queria ajuda pra escolher móveis que combinam. Vocês oferecem algum tipo de consultoria?",
        at: "2026-06-21T07:18:00-03:00",
      },
      {
        id: "m2",
        author: "ai",
        body: "Que momento especial, Fernanda! 🏡 Oferecemos sim: a Consultoria de decoração online sai por R$ 199,00 e o valor é abatido na sua primeira compra acima de R$ 2.000,00. Quer que eu agende um horário?",
        at: "2026-06-21T07:19:00-03:00",
        confidence: 0.79,
      },
    ],
  },
  {
    id: "c8",
    channel: "instagram",
    source: "comment",
    intent: "spam",
    unread: false,
    resolved: false,
    status: "aberta",
    contact: {
      name: "Promo Imperdível",
      phone: "+55 11 90000-0000",
      email: "contato@promoimperdivel.xyz",
      location: "Desconhecida",
      tags: ["Suspeito"],
      history: {
        leads: 0,
        orders: 0,
        totalSpentCents: 0,
        avgTicketCents: 0,
        firstSeenAt: "2026-06-21T06:00:00-03:00",
      },
      graphProducts: [],
      campaign: { name: "—", channel: "instagram" },
      consent: {
        optIn: false,
        basis: "Sem consentimento",
        at: "2026-06-21T06:00:00-03:00",
      },
    },
    messages: [
      {
        id: "m1",
        author: "contact",
        body: "GANHE R$ 5.000 AGORA!!! Clique no link da bio 🔥🔥 promoimperdivel.xyz/ganhe",
        at: "2026-06-21T06:01:00-03:00",
      },
    ],
  },
]

/** Conversa selecionada por padrão (thread rica com IA + sugestão pendente). */
export const DEFAULT_CONVERSATION_ID = "c1"
