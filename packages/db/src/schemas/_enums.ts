/**
 * Enums Postgres do domínio do funil. Espelham as taxonomias do front
 * (apps/web/shared/domain/{taxonomy,channels}.ts) — a língua é uma só.
 */
import { pgEnum } from "drizzle-orm/pg-core"

/**
 * Papel da etapa no funil (docs/funcionalidades/kanban.md):
 * `new` = porta de entrada (pouso de cards vindos de outro pipeline);
 * `active` = trabalho em andamento; `won`/`lost` = absorventes (fim de vida).
 */
export const stageType = pgEnum("stage_type", ["new", "active", "won", "lost"])

/** Canal de origem do card — espelho de `Channel` (channels.ts do web). */
export const channel = pgEnum("channel", [
  "instagram",
  "facebook",
  "whatsapp",
  "tiktok",
  "x",
  "mercadolivre",
  "web",
])

/** Intenção classificada pela IA — espelho de `Intent` (taxonomy.ts do web). */
export const intent = pgEnum("intent", [
  "duvida",
  "intencao_de_compra",
  "elogio",
  "reclamacao",
  "suporte",
  "spam",
])

/**
 * Tipos do evento canônico de card (append-only). v1 emite só estes três;
 * v2 (automações) estende o enum sem tocar na tabela.
 */
export const cardEventType = pgEnum("card_event_type", [
  "card.created",
  "card.stage_changed",
  "card.pipeline_changed",
])
