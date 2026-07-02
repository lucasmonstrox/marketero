/**
 * Schemas TypeBox transversais (≥2 features) — espelham os pgEnums de
 * @workspace/db e as taxonomias do web. Ficam FORA das features para nenhuma
 * importar model de outra (segregação entre features).
 */
import { t } from "elysia"

/** Papel da etapa no funil (pgEnum stage_type). */
export const StageTypeSchema = t.Union([t.Literal("new"), t.Literal("active"), t.Literal("won"), t.Literal("lost")])

/** Canal de origem (pgEnum channel). */
export const ChannelSchema = t.Union([
  t.Literal("instagram"),
  t.Literal("facebook"),
  t.Literal("whatsapp"),
  t.Literal("tiktok"),
  t.Literal("x"),
  t.Literal("mercadolivre"),
  t.Literal("web"),
])

/** Intenção classificada pela IA (pgEnum intent). */
export const IntentSchema = t.Union([
  t.Literal("duvida"),
  t.Literal("intencao_de_compra"),
  t.Literal("elogio"),
  t.Literal("reclamacao"),
  t.Literal("suporte"),
  t.Literal("spam"),
])

/** Acento visual da coluna — preferência de UI, não domínio (jsonb no banco). */
export const AccentSchema = t.Union([
  t.Object({ kind: t.Literal("chart"), n: t.Integer({ minimum: 1, maximum: 5 }) }),
  t.Object({ kind: t.Literal("tone"), tone: t.String() }),
])

/** Param de rota `:id` (uuid) — usado por todas as features. */
export const IdParam = t.Object({ id: t.String({ format: "uuid" }) })

/** Query de paginação padrão (limit/offset com teto sano). */
export const PaginationQuery = t.Object({
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 200, default: 50 })),
  offset: t.Optional(t.Integer({ minimum: 0, default: 0 })),
})
