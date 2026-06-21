import type { PaletteGroup } from "./types"

/**
 * Catálogo do NodePalette (kanban.md §Catálogo de Triggers/Robôs). Agrupado por
 * família; cada item é clicável-para-adicionar no canvas. Copy pt-BR.
 */
export const PALETTE_GROUPS: PaletteGroup[] = [
  {
    kind: "trigger",
    label: "Gatilhos",
    items: [
      {
        template: "trigger.comment",
        kind: "trigger",
        label: "Comentário IG/FB",
        hint: "Novo comentário em post ou anúncio",
        icon: "trigger.comment",
        channel: "instagram",
      },
      {
        template: "trigger.dm",
        kind: "trigger",
        label: "DM recebida",
        hint: "Mensagem direta no Instagram/Facebook",
        icon: "trigger.dm",
        channel: "instagram",
      },
      {
        template: "trigger.whatsapp",
        kind: "trigger",
        label: "WhatsApp recebido",
        hint: "Nova mensagem no WhatsApp",
        icon: "trigger.whatsapp",
        channel: "whatsapp",
      },
      {
        template: "trigger.leadgen",
        kind: "trigger",
        label: "Lead Ads (leadgen)",
        hint: "Webhook leadgen da Meta",
        icon: "trigger.leadgen",
        channel: "facebook",
      },
      {
        template: "trigger.webform",
        kind: "trigger",
        label: "Formulário web",
        hint: "Envio de formulário no site",
        icon: "trigger.webform",
        channel: "web",
      },
      {
        template: "trigger.order_paid",
        kind: "trigger",
        label: "Pedido pago",
        hint: "Pedido confirmado na loja própria",
        icon: "trigger.order_paid",
        channel: "web",
      },
      {
        template: "trigger.marketplace",
        kind: "trigger",
        label: "Pergunta no marketplace",
        hint: "Nova pergunta no Mercado Livre",
        icon: "trigger.marketplace",
        channel: "mercadolivre",
      },
      {
        template: "trigger.timer",
        kind: "trigger",
        label: "Timer / SLA",
        hint: "Disparo de timer (sem contato há X)",
        icon: "trigger.timer",
      },
    ],
  },
  {
    kind: "ai",
    label: "IA · GraphRAG",
    items: [
      {
        template: "ai.classify",
        kind: "ai",
        label: "Classificar intenção",
        hint: "Roteamento por intenção + confiança",
        icon: "ai.classify",
      },
      {
        template: "ai.reply",
        kind: "ai",
        label: "Responder via GraphRAG",
        hint: "Resposta gerada do grafo de conhecimento",
        icon: "ai.reply",
      },
      {
        template: "ai.suggest",
        kind: "ai",
        label: "Sugerir produto",
        hint: "Recomendação de produto do grafo",
        icon: "ai.suggest",
      },
    ],
  },
  {
    kind: "action",
    label: "Ações",
    items: [
      {
        template: "action.whatsapp",
        kind: "action",
        label: "Enviar WhatsApp",
        hint: "Template aprovado pela Meta",
        icon: "action.whatsapp",
        channel: "whatsapp",
      },
      {
        template: "action.tag",
        kind: "action",
        label: "Etiquetar",
        hint: "Aplica etiqueta ao card",
        icon: "action.tag",
      },
      {
        template: "action.assign",
        kind: "action",
        label: "Atribuir",
        hint: "Define responsável pelo card",
        icon: "action.assign",
      },
      {
        template: "action.move",
        kind: "action",
        label: "Mover card",
        hint: "Move o card para outra etapa",
        icon: "action.move",
      },
      {
        template: "action.delay",
        kind: "action",
        label: "Esperar / delay",
        hint: "Aguarda um intervalo antes de seguir",
        icon: "action.delay",
      },
      {
        template: "action.timer",
        kind: "action",
        label: "Armar timer de SLA",
        hint: "Cria scheduled_task (on-stay)",
        icon: "action.timer",
      },
      {
        template: "action.webhook",
        kind: "action",
        label: "Webhook",
        hint: "POST para um endpoint externo",
        icon: "action.webhook",
      },
      {
        template: "action.capi",
        kind: "action",
        label: "Devolver CAPI",
        hint: "Conversão server-side para a Meta",
        icon: "action.capi",
      },
    ],
  },
  {
    kind: "condition",
    label: "Condições",
    items: [
      {
        template: "condition.ifelse",
        kind: "condition",
        label: "Se / senão",
        hint: "Ramifica o fluxo por uma condição",
        icon: "condition.ifelse",
      },
    ],
  },
]
