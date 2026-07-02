import type { BoardCard, BoardResponse, ContactResponse } from "@/shared/api/types"
import type { Channel } from "@/shared/domain/channels"
import type { AutomationState, Intent, StageType } from "@/shared/domain/taxonomy"

import { normalizeAccent, type StageAccent } from "./accents"
import { defaultAutomationsFor, type StageRobot, type StageTrigger } from "./automations"

/**
 * View-models do board: o que os componentes renderizam. `adaptBoard` traduz o
 * contrato da API (BoardResponse) + o Map de contatos para estes shapes —
 * único ponto de mapeamento servidor→UI.
 */

export interface UiCard {
  id: string
  contactId: string
  /** Resolvido via Map de contatos; fallback quando o contato sumiu. */
  contactName: string
  /** Título do card (linha secundária, ex.: produto/origem). */
  subtitle: string
  valueCents: number
  channel: Channel
  intent: Intent | null
  /** Nome livre do responsável (API `assignedTo`); null → sem avatar. */
  ownerName: string | null
  ownerInitials: string
  /** Entrada na etapa — base do "há X" (relógio real). */
  enteredAt: string | Date
  tags: string[]
  /** UI-only — sempre undefined em cards reais (sem backend de automação). */
  automation?: AutomationState
  automationDetail?: string
  aiSuggestion?: string
}

export interface UiStage {
  id: string
  name: string
  type: StageType
  accent: StageAccent
  wipLimit: number
  triggers: StageTrigger[]
  robots: StageRobot[]
  cards: UiCard[]
}

/** "Ana Souza" → "AS"; "ia" → "IA"; string vazia → "?" */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

function adaptCard(card: BoardCard, contactsById: Map<string, ContactResponse>): UiCard {
  const contact = contactsById.get(card.contactId)
  return {
    id: card.id,
    contactId: card.contactId,
    contactName: contact?.name ?? "Contato removido",
    subtitle: card.title,
    valueCents: card.valueCents,
    channel: card.channel,
    intent: card.intent,
    ownerName: card.assignedTo,
    ownerInitials: card.assignedTo ? initialsOf(card.assignedTo) : "?",
    enteredAt: card.enteredStageAt,
    tags: card.tags,
  }
}

export function adaptBoard(
  board: BoardResponse,
  contactsById: Map<string, ContactResponse>,
): UiStage[] {
  return board.stages.map((stage, index) => ({
    id: stage.id,
    name: stage.name,
    type: stage.type,
    accent: normalizeAccent(stage.accent, index),
    wipLimit: stage.wipLimit,
    ...defaultAutomationsFor(stage.id, stage.type),
    cards: stage.cards.map((c) => adaptCard(c, contactsById)),
  }))
}
