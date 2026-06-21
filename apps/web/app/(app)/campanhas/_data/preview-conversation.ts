import type { AutomationState } from "@/shared/domain/taxonomy"

/**
 * Roteiro fictício da conversa de preview (agentes.md §3) — a Clara conduzindo o
 * Form "Orçamento de móveis sob medida" via FSM. Cada passo avança a máquina:
 * o bot pergunta (NL), o lead responde, e os slots vão preenchendo.
 *
 * Inclui de propósito: slot-filling múltiplo, uma DIGRESSÃO com retomada
 * (anchor & return, §3.1), o gate de consentimento (LGPD) e o `complete`.
 *
 * UI-only — dados fictícios colocados aqui de propósito.
 */

/** Estado da FSM exibido no chip. Mapeia para tons via PREVIEW_STATE_META. */
export type FsmState =
  | "welcome"
  | "collect"
  | "digress"
  | "validate"
  | "review"
  | "consent"
  | "complete"

/** Tom de cada estado da FSM, reaproveitando a escala de automação (taxonomy). */
export const PREVIEW_STATE_META: Record<
  FsmState,
  { label: string; automation: AutomationState }
> = {
  welcome: { label: "welcome", automation: "idle" },
  collect: { label: "collect", automation: "running" },
  digress: { label: "digress", automation: "waiting" },
  validate: { label: "validate", automation: "running" },
  review: { label: "review", automation: "running" },
  consent: { label: "consent", automation: "waiting" },
  complete: { label: "complete", automation: "completed" },
}

/** Slots do Form "Sob medida" (chaves casam com forms.ts → form-sob-medida). */
export type SlotKey = "nome" | "email" | "telefone" | "ambiente" | "orcamento"

export interface SlotPatch {
  key: SlotKey
  /** Valor já normalizado (telefone em E.164, orçamento em centavos). */
  value: string | number
  /** Rótulo legível para exibir no inspetor. */
  display: string
}

export type Speaker = "bot" | "lead"

export interface ConversationMessage {
  speaker: Speaker
  text: string
  /** Anotação opcional (ex.: "digressão", "validação") para o tour didático. */
  note?: string
}

/**
 * Um passo = a fala (ou falas) que aparecem ao avançar. O primeiro passo é só do
 * bot (welcome); cada clique em "Próxima resposta do lead" revela o próximo.
 */
export interface ConversationStep {
  /** Estado da FSM ao final deste passo. */
  state: FsmState
  messages: ConversationMessage[]
  /** Slots preenchidos neste passo (podem ser vários — slot-filling). */
  fills?: SlotPatch[]
  /** Marca o passo em que o gate de consentimento é apresentado. */
  consentGate?: boolean
}

export const PREVIEW_CONVERSATION: ConversationStep[] = [
  {
    state: "welcome",
    messages: [
      {
        speaker: "bot",
        text: "Oi! Eu sou a Clara, da Bella Decor. Posso te ajudar a montar um orçamento de móveis planejados sob medida. Pra começar, como posso te chamar?",
      },
    ],
  },
  {
    state: "collect",
    messages: [
      { speaker: "lead", text: "Oi Clara! Pode me chamar de Mariana 😊" },
      {
        speaker: "bot",
        text: "Prazer, Mariana! Qual o seu melhor e-mail pra eu te enviar a proposta?",
      },
    ],
    fills: [{ key: "nome", value: "Mariana", display: "Mariana" }],
  },
  {
    state: "validate",
    messages: [
      { speaker: "lead", text: "mariana.alves@gmail.com" },
      {
        speaker: "bot",
        text: "Anotado! E um WhatsApp com DDD pra nossa equipe falar com você?",
        note: "E-mail validado por regex",
      },
    ],
    fills: [
      {
        key: "email",
        value: "mariana.alves@gmail.com",
        display: "mariana.alves@gmail.com",
      },
    ],
  },
  {
    state: "digress",
    messages: [
      {
        speaker: "lead",
        text: "Antes — vocês fazem entrega e montagem em Campinas?",
        note: "Digressão: o lead muda de assunto antes de responder o telefone",
      },
      {
        speaker: "bot",
        text: "Fazemos sim, Mariana — entregamos e montamos em toda a região de Campinas, sem custo extra. Voltando: me confirma seu WhatsApp com DDD?",
        note: "Atende via GraphRAG e retoma o slot pendente (anchor & return)",
      },
    ],
  },
  {
    state: "validate",
    messages: [
      { speaker: "lead", text: "(19) 99876-5432" },
      {
        speaker: "bot",
        text: "Perfeito! Pra qual ambiente você quer o projeto: cozinha, dormitório, sala ou home office?",
        note: "Telefone normalizado para E.164 (+55)",
      },
    ],
    fills: [
      {
        key: "telefone",
        value: "+5519998765432",
        display: "+55 19 99876-5432",
      },
    ],
  },
  {
    state: "collect",
    messages: [
      { speaker: "lead", text: "É pra cozinha mesmo, estou reformando agora." },
      {
        speaker: "bot",
        text: "Ótima escolha! Cozinhas planejadas são nosso forte. Pra eu calibrar a proposta, qual faixa de investimento você tem em mente?",
      },
    ],
    fills: [{ key: "ambiente", value: "cozinha", display: "Cozinha" }],
  },
  {
    state: "review",
    messages: [
      { speaker: "lead", text: "Algo em torno de uns 25 mil reais." },
      {
        speaker: "bot",
        text: "Anotei: cozinha planejada, faixa de R$ 25.000. Só confirmando seus dados antes de gerar a proposta — está tudo certo?",
        note: "Form de alta intenção → passa pelo estado review",
      },
    ],
    fills: [{ key: "orcamento", value: 2500000, display: "R$ 25.000,00" }],
  },
  {
    state: "consent",
    consentGate: true,
    messages: [
      { speaker: "lead", text: "Tudo certo, pode mandar!" },
      {
        speaker: "bot",
        text: "Maravilha! Por último, preciso da sua autorização: você concorda que a Bella Decor use seus dados para enviar o orçamento e entrar em contato?",
        note: "Gate de consentimento (LGPD) — sem aceite, a FSM não conclui",
      },
    ],
  },
  {
    state: "complete",
    messages: [
      { speaker: "lead", text: "Concordo!" },
      {
        speaker: "bot",
        text: "Prontinho, Mariana! 🎉 Seu orçamento de cozinha planejada já está com a nossa equipe e em breve você recebe a proposta no seu WhatsApp. Obrigada pelo contato!",
        note: "Lead emitido para o mini-CRM (field_data + consentimento)",
      },
    ],
  },
]
