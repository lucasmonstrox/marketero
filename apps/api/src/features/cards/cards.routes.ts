/**
 * Wiring da feature CARDS: prefix + 1 rota → 1 função livre. O controller só
 * mapeia result objects para status HTTP — a coreografia mora nos services.
 */
import { Elysia, t } from "elysia"

import { database } from "../../shared/db"
import { IdParam, PaginationQuery } from "../../shared/domain/model"
import { ErrorResponse } from "../../shared/errors/model"
import { createCard } from "./create-card/create-card.service"
import { deleteCard } from "./delete-card/delete-card.service"
import { getCard } from "./get-card/get-card.service"
import { listCardEvents } from "./list-card-events/list-card-events.service"
import { listCards } from "./list-cards/list-cards.service"
import { moveCard } from "./move-card/move-card.service"
import {
  CardCreate,
  CardEventResponse,
  CardListQuery,
  CardResponse,
  CardUpdate,
  MoveBody,
  MoveResponse,
} from "./shared/model"
import { toCardEventResponse, toCardResponse } from "./shared/serialize"
import { updateCard } from "./update-card/update-card.service"

/** Erros de referência inexistente viram 404; regras de negócio viram 422. */
const NOT_FOUND_REASONS = new Set(["not_found", "pipeline_not_found"])

export const cards = new Elysia({ prefix: "/cards", tags: ["Cards"] })
  .use(database)
  .get("/", async ({ db, query }) => (await listCards(db, query)).map(toCardResponse), {
    query: CardListQuery,
    response: { 200: t.Array(CardResponse) },
    detail: { summary: "Lista cards (filtros pipeline/stage/contact; ordem do board)" },
  })
  .get(
    "/:id",
    async ({ db, params: { id }, status }) => {
      const row = await getCard(db, id)
      return row ? toCardResponse(row) : status(404, { error: "not_found" })
    },
    {
      params: IdParam,
      response: { 200: CardResponse, 404: ErrorResponse },
      detail: { summary: "Detalha um card" },
    },
  )
  .post(
    "/",
    async ({ db, body, status }) => {
      const r = await createCard(db, body)
      if (!r.ok && NOT_FOUND_REASONS.has(r.reason)) return status(404, { error: r.reason })
      if (!r.ok) return status(422, { error: r.reason })
      return status(201, toCardResponse((await getCard(db, r.id))!))
    },
    {
      body: CardCreate,
      response: { 201: CardResponse, 404: ErrorResponse, 422: ErrorResponse },
      detail: { summary: "Cria um card (default: coluna type=new; emite card.created; respeita WIP)" },
    },
  )
  .put(
    "/:id",
    async ({ db, params: { id }, body, status }) => {
      const r = await updateCard(db, id, body)
      if (!r.ok) return status(404, { error: "not_found" })
      return toCardResponse((await getCard(db, id))!)
    },
    {
      params: IdParam,
      body: CardUpdate,
      response: { 200: CardResponse, 404: ErrorResponse, 422: ErrorResponse },
      detail: { summary: "Atualiza campos não-posicionais (mover é só via /move)" },
    },
  )
  .post(
    "/:id/move",
    async ({ db, params: { id }, body, status }) => {
      const r = await moveCard(db, id, body)
      if (!r.ok && NOT_FOUND_REASONS.has(r.reason)) return status(404, { error: r.reason })
      if (!r.ok) return status(422, { error: r.reason })
      return { card: toCardResponse((await getCard(db, id))!), moved: r.moved }
    },
    {
      params: IdParam,
      body: MoveBody,
      response: { 200: MoveResponse, 404: ErrorResponse, 422: ErrorResponse },
      detail: {
        summary: "Move o card (mesma coluna=reorder; cross-pipeline pousa no type=new; eventos na mesma transação)",
      },
    },
  )
  .delete(
    "/:id",
    async ({ db, params: { id }, status }) => {
      const r = await deleteCard(db, id)
      if (!r.ok) return status(404, { error: "not_found" })
      return status(204, undefined)
    },
    {
      params: IdParam,
      response: { 204: t.Void(), 404: ErrorResponse },
      detail: { summary: "Apaga um card (timeline cascateia)" },
    },
  )
  .get(
    "/:id/events",
    async ({ db, params: { id }, query, status }) => {
      const r = await listCardEvents(db, id, query)
      if (!r.ok) return status(404, { error: "not_found" })
      return r.events.map(toCardEventResponse)
    },
    {
      params: IdParam,
      query: PaginationQuery,
      response: { 200: t.Array(CardEventResponse), 404: ErrorResponse },
      detail: { summary: "Timeline do card (ordem causal por seq)" },
    },
  )
