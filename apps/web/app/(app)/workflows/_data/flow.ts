import { type Edge, MarkerType } from "@xyflow/react"

import type { FlowNode } from "./types"

/**
 * Fluxo-exemplo "Lead Ads → Qualificação → CAPI" (kanban.md Cenário 1):
 * leadgen → classificar intenção (GraphRAG) → intenção = compra? →
 * (sim) responder via GraphRAG + armar SLA + devolver CAPI · (não) etiquetar frio.
 * Posições fixas e generosas para leitura imediata; o usuário pode rearranjar.
 */
export const initialNodes: FlowNode[] = [
  {
    id: "n-leadgen",
    type: "trigger",
    position: { x: 64, y: 220 },
    data: {
      kind: "trigger",
      template: "trigger.leadgen",
      title: "Lead Ads (leadgen)",
      subtitle: "Webhook leadgen · campanha Outono",
      channel: "facebook",
    },
  },
  {
    id: "n-classify",
    type: "ai",
    position: { x: 360, y: 212 },
    data: {
      kind: "ai",
      template: "ai.classify",
      title: "Classificar intenção",
      subtitle: "GraphRAG · roteamento na ingestão",
    },
  },
  {
    id: "n-condition",
    type: "condition",
    position: { x: 664, y: 208 },
    data: {
      kind: "condition",
      template: "condition.ifelse",
      title: "Intenção = compra?",
      subtitle: "confiança ≥ 0,80",
    },
  },
  {
    id: "n-reply",
    type: "action",
    position: { x: 980, y: 64 },
    data: {
      kind: "action",
      template: "action.whatsapp",
      title: "Responder via GraphRAG",
      subtitle: "WhatsApp · template aprovado",
      channel: "whatsapp",
    },
  },
  {
    id: "n-sla",
    type: "action",
    position: { x: 980, y: 220 },
    data: {
      kind: "action",
      template: "action.timer",
      title: "Armar timer de SLA",
      subtitle: "scheduled_task · escalar em 15 min",
    },
  },
  {
    id: "n-capi",
    type: "action",
    position: { x: 980, y: 376 },
    data: {
      kind: "action",
      template: "action.capi",
      title: "Devolver conversão (CAPI)",
      subtitle: "qualified_lead · system_generated",
    },
  },
  {
    id: "n-tag-cold",
    type: "action",
    position: { x: 980, y: 520 },
    data: {
      kind: "action",
      template: "action.tag",
      title: "Etiquetar: frio",
      subtitle: "Aguardar reengajamento",
    },
  },
]

const baseEdge = {
  type: "smoothstep" as const,
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
}

export const initialEdges: Edge[] = [
  {
    ...baseEdge,
    id: "e-leadgen-classify",
    source: "n-leadgen",
    target: "n-classify",
  },
  {
    ...baseEdge,
    id: "e-classify-condition",
    source: "n-classify",
    target: "n-condition",
  },
  {
    ...baseEdge,
    id: "e-condition-reply",
    source: "n-condition",
    sourceHandle: "yes",
    target: "n-reply",
    label: "sim",
    data: { branch: "yes" },
  },
  {
    ...baseEdge,
    id: "e-reply-sla",
    source: "n-reply",
    target: "n-sla",
  },
  {
    ...baseEdge,
    id: "e-sla-capi",
    source: "n-sla",
    target: "n-capi",
  },
  {
    ...baseEdge,
    id: "e-condition-tag",
    source: "n-condition",
    sourceHandle: "no",
    target: "n-tag-cold",
    label: "não",
    data: { branch: "no" },
  },
]
