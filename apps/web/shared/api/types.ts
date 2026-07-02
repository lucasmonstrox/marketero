/**
 * Tipos de resposta inferidos do Eden client — sem duplicar o contrato do
 * servidor. Os thunks abaixo NUNCA são executados: existem só para forçar a
 * resolução de overloads do treaty (`:id` vs `:pipelineId` criam assinaturas
 * distintas) e extrair o tipo do `data`. Se a inferência cair para `any`
 * (path alias no apps/api), o typecheck de packages/api-client acusa antes.
 */
import { api } from "@workspace/api-client"

type Data<T> = T extends { data: infer D } ? NonNullable<D> : never

const _pipelines = () => api.api.v1.pipelines.get()
const _board = (id: string) => api.api.v1.pipelines({ id }).board.get()
const _card = (id: string) => api.api.v1.cards({ id }).get()
const _cardEvents = (id: string) => api.api.v1.cards({ id }).events.get()
const _contacts = () => api.api.v1.contacts.get({ query: {} })
void _pipelines, _board, _card, _cardEvents, _contacts

export type PipelineResponse = Data<Awaited<ReturnType<typeof _pipelines>>>[number]
export type StageResponse = PipelineResponse["stages"][number]

export type BoardResponse = Data<Awaited<ReturnType<typeof _board>>>
export type BoardStage = BoardResponse["stages"][number]
export type BoardCard = BoardStage["cards"][number]

export type CardResponse = Data<Awaited<ReturnType<typeof _card>>>
export type CardEventResponse = Data<Awaited<ReturnType<typeof _cardEvents>>>[number]

export type ContactResponse = Data<Awaited<ReturnType<typeof _contacts>>>[number]

export type StageAccent = NonNullable<StageResponse["accent"]>
export type StageType = StageResponse["type"]
export type Channel = BoardCard["channel"]
export type Intent = NonNullable<BoardCard["intent"]>
