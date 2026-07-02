/** Query keys centralizadas — única fonte para invalidação cruzada. */
export const queryKeys = {
  pipelines: ["pipelines"] as const,
  board: (pipelineId: string) => ["board", pipelineId] as const,
  boards: ["board"] as const,
  contacts: ["contacts"] as const,
  cardEvents: (cardId: string) => ["card-events", cardId] as const,
}
