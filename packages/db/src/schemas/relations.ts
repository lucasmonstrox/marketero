/**
 * Relations API do Drizzle — habilita `db.query.X.findMany({ with: ... })`.
 * Só descreve o grafo (pipeline↔stages↔cards↔contact↔events); as FKs reais
 * vivem nos arquivos de cada model.
 */
import { relations } from "drizzle-orm"

import { cardEvents } from "./card-events"
import { cards } from "./cards"
import { contacts } from "./contacts"
import { pipelines } from "./pipelines"
import { stages } from "./stages"

export const pipelinesRelations = relations(pipelines, ({ many }) => ({
  stages: many(stages),
  cards: many(cards),
}))

export const stagesRelations = relations(stages, ({ one, many }) => ({
  pipeline: one(pipelines, { fields: [stages.pipelineId], references: [pipelines.id] }),
  cards: many(cards),
}))

export const contactsRelations = relations(contacts, ({ many }) => ({
  cards: many(cards),
}))

export const cardsRelations = relations(cards, ({ one, many }) => ({
  pipeline: one(pipelines, { fields: [cards.pipelineId], references: [pipelines.id] }),
  stage: one(stages, { fields: [cards.stageId], references: [stages.id] }),
  contact: one(contacts, { fields: [cards.contactId], references: [contacts.id] }),
  events: many(cardEvents),
}))

export const cardEventsRelations = relations(cardEvents, ({ one }) => ({
  card: one(cards, { fields: [cardEvents.cardId], references: [cards.id] }),
}))
