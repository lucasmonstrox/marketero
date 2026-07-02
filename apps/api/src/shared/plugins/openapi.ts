/**
 * Documentação OpenAPI (Scalar) servida em `/openapi`, JSON em `/openapi/json`.
 * O schema é derivado automaticamente dos validadores TypeBox de cada rota
 * (body/query/params/response). As tags agrupam os endpoints por feature.
 */
import { openapi } from "@elysiajs/openapi"
import { Elysia } from "elysia"

export const openapiPlugin = new Elysia({ name: "plugin.openapi" }).use(
  openapi({
    path: "/openapi",
    documentation: {
      info: {
        title: "Marketero API",
        version: "0.1.0",
        description: "API do mini-CRM/funil do Marketero (Elysia + Drizzle). Single-tenant nesta fase.",
      },
      tags: [
        { name: "Contacts", description: "Pessoas — a identidade deduplicada por trás dos cards." },
        { name: "Pipelines", description: "Kanbans (funis) e a visão de board." },
        { name: "Stages", description: "Colunas do kanban: criar, ajustar, reordenar, excluir." },
        { name: "Cards", description: "Negócios/oportunidades: CRUD, movimento e timeline de eventos." },
      ],
    },
  }),
)
