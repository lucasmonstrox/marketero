"use client"

/**
 * Hooks de cards. `useMoveCard` tem mutationKey estável: o KanbanBoard usa
 * `useIsMutating` para segurar o resync do board enquanto um move está em voo.
 */
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@workspace/api-client"

import { toastApiError, unwrap } from "./errors"
import { queryKeys } from "./keys"

type CardCreateBody = Parameters<typeof api.api.v1.cards.post>[0]
type CardUpdateBody = Parameters<ReturnType<typeof api.api.v1.cards>["put"]>[0]
type MoveBody = Parameters<ReturnType<typeof api.api.v1.cards>["move"]["post"]>[0]

export const MOVE_CARD_KEY = ["move-card"] as const

export function useCreateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CardCreateBody) => unwrap(await api.api.v1.cards.post(body)),
    onSuccess: (card) => qc.invalidateQueries({ queryKey: queryKeys.board(card.pipelineId) }),
    onError: toastApiError,
  })
}

export function useUpdateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: CardUpdateBody & { id: string }) =>
      unwrap(await api.api.v1.cards({ id }).put(body)),
    onSuccess: (card) => qc.invalidateQueries({ queryKey: queryKeys.board(card.pipelineId) }),
    onError: toastApiError,
  })
}

export function useDeleteCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; pipelineId: string }) =>
      unwrap(await api.api.v1.cards({ id }).delete()),
    onSuccess: (_, { pipelineId }) => qc.invalidateQueries({ queryKey: queryKeys.board(pipelineId) }),
    onError: toastApiError,
  })
}

export function useMoveCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: MOVE_CARD_KEY,
    mutationFn: async ({ id, ...body }: MoveBody & { id: string }) =>
      unwrap(await api.api.v1.cards({ id }).move.post(body)),
    onError: toastApiError,
    // onSettled (sucesso OU erro): refetch resincroniza posições normalizadas
    // pelo servidor — e faz o rollback visual no caso de erro (ex.: WIP).
    onSettled: (data) => {
      const pid = data?.card.pipelineId
      void qc.invalidateQueries({ queryKey: pid ? queryKeys.board(pid) : queryKeys.boards })
    },
  })
}

export function useIsMovingCard() {
  return useIsMutating({ mutationKey: MOVE_CARD_KEY }) > 0
}

export function useCardEvents(cardId: string | null) {
  return useQuery({
    queryKey: queryKeys.cardEvents(cardId ?? ""),
    queryFn: async () => unwrap(await api.api.v1.cards({ id: cardId! }).events.get({ query: {} })),
    enabled: cardId !== null,
  })
}
