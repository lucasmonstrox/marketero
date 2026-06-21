import type { Node } from "@xyflow/react"

import type { Channel } from "@/shared/domain/channels"
import type { SemanticTone } from "@/shared/domain/taxonomy"

/**
 * Modelo do editor visual de automações (kanban.md §"trigger → IA → ação").
 * Quatro famílias de nó refletem o motor: **gatilho** (condição de entrada),
 * **IA** (classificação/resposta GraphRAG), **condição** (if/else) e **ação**
 * (robô de saída). A família dita tom + ícone — nunca uma cor crua. UI-only:
 * os dados de config são mock, só para alimentar o inspetor.
 */

export type NodeKind = "trigger" | "ai" | "condition" | "action"

/** Tom semântico de cada família, derivado da escala de status do design system. */
export const KIND_TONE: Record<NodeKind, SemanticTone> = {
  trigger: "info",
  ai: "info", // IA usa o accent --ai dedicado; o tom só vale de fallback
  condition: "warning",
  action: "success",
}

export const KIND_LABEL: Record<NodeKind, string> = {
  trigger: "Gatilho",
  ai: "IA · GraphRAG",
  condition: "Condição",
  action: "Ação",
}

/** Dados comuns a todo nó do fluxo. `Record<string, unknown>` p/ casar com React Flow. */
export interface BaseNodeData extends Record<string, unknown> {
  kind: NodeKind
  /** id do template do palette (define ícone + form do inspetor). */
  template: string
  title: string
  subtitle?: string
  /** Canal opcional para realce de marca (badge/ícone). */
  channel?: Channel
}

export type FlowNode = Node<BaseNodeData>

/** Item clicável do NodePalette. */
export interface PaletteItem {
  template: string
  kind: NodeKind
  label: string
  hint: string
  /** Nome do ícone lucide (resolvido em mapa estático no componente). */
  icon: string
  channel?: Channel
}

export interface PaletteGroup {
  kind: NodeKind
  label: string
  items: PaletteItem[]
}
