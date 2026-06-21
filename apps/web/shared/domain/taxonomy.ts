/**
 * Taxonomias transversais do produto: classificação de IA (kanban.md), faixas
 * de confiança, estados de automação/atendimento (design-system §5.3) e modelos
 * de Agente (agentes.md §9). Centralizadas para que inbox, funil e workflows
 * falem a MESMA língua de status — cor sempre derivada da escala semântica, não
 * um hue novo por categoria.
 */

/** Tom semântico → mapeado para os tokens de status do design system. */
export type SemanticTone = "success" | "warning" | "info" | "destructive" | "muted"

/** Classes de badge "soft" (tinta + texto + borda) por tom. Reutilizável em
 * qualquer chip de status (classificação, estado de automação, etc.). */
export const TONE_BADGE: Record<SemanticTone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/15 text-warning-foreground",
  info: "border-info/30 bg-info/10 text-info",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted text-muted-foreground",
}

/* ----------------------------- Classificação ----------------------------- */

/** Taxonomia FECHADA de intents do classificador de roteamento (kanban.md). */
export type Intent =
  | "duvida"
  | "intencao_de_compra"
  | "elogio"
  | "reclamacao"
  | "suporte"
  | "spam"

export interface IntentMeta {
  id: Intent
  label: string
  tone: SemanticTone
}

export const INTENT_META: Record<Intent, IntentMeta> = {
  intencao_de_compra: { id: "intencao_de_compra", label: "Intenção de compra", tone: "success" },
  duvida: { id: "duvida", label: "Dúvida", tone: "info" },
  elogio: { id: "elogio", label: "Elogio", tone: "success" },
  reclamacao: { id: "reclamacao", label: "Reclamação", tone: "warning" },
  suporte: { id: "suporte", label: "Suporte", tone: "info" },
  spam: { id: "spam", label: "Spam", tone: "muted" },
}

export const INTENTS: Intent[] = Object.keys(INTENT_META) as Intent[]

/* ------------------------- Faixas de confiança --------------------------- */

export type ConfidenceBand = "auto" | "review" | "ignore"

/** Cortes default do produto (kanban.md): ≥0.80 auto-age · 0.50–0.79 revisão
 * humana · <0.50 ignora/inbox. */
export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.8) return "auto"
  if (confidence >= 0.5) return "review"
  return "ignore"
}

export const CONFIDENCE_BAND_META: Record<
  ConfidenceBand,
  { label: string; tone: SemanticTone }
> = {
  auto: { label: "Auto-agir", tone: "success" },
  review: { label: "Revisar IA", tone: "warning" },
  ignore: { label: "Ignorar", tone: "muted" },
}

/* ------------------------ Estados de automação --------------------------- */

export type AutomationState =
  | "idle"
  | "running"
  | "waiting"
  | "escalated"
  | "failed"
  | "completed"

export const AUTOMATION_META: Record<
  AutomationState,
  { label: string; tone: SemanticTone }
> = {
  idle: { label: "Ocioso", tone: "muted" },
  running: { label: "Executando", tone: "info" },
  waiting: { label: "Aguardando", tone: "warning" },
  escalated: { label: "Escalado", tone: "warning" },
  failed: { label: "Falhou", tone: "destructive" },
  completed: { label: "Concluído", tone: "success" },
}

/* ----------------------------- Estágios funil ---------------------------- */

/** Tipos de estágio do pipeline (leads-crm.md §6.2 / kanban.md). */
export type StageType = "new" | "active" | "won" | "lost"

/* ----------------------------- Modelos de IA ----------------------------- */

export interface AgentModel {
  id: string
  label: string
  hint: string
}

/** Modelos disponíveis para o Agente conversacional (agentes.md §9). */
export const AGENT_MODELS: AgentModel[] = [
  { id: "claude-opus-4-8", label: "Claude Opus 4.8", hint: "Máxima qualidade" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", hint: "Equilíbrio custo/qualidade" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", hint: "Rápido e econômico" },
]
