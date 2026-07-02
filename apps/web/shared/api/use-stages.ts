"use client"

/** Hooks de etapas (colunas): CRUD + reorder, invalidando board + pipelines. */
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@workspace/api-client"

import { toastApiError, unwrap } from "./errors"
import { queryKeys } from "./keys"

type StageCreateBody = Parameters<ReturnType<typeof api.api.v1.pipelines>["stages"]["post"]>[0]
type StageUpdateBody = Parameters<ReturnType<typeof api.api.v1.stages>["put"]>[0]

/** Invalida o board do pipeline e a lista de pipelines (stages embutidas). */
function useInvalidateStages() {
  const qc = useQueryClient()
  return (pipelineId: string) => {
    void qc.invalidateQueries({ queryKey: queryKeys.board(pipelineId) })
    void qc.invalidateQueries({ queryKey: queryKeys.pipelines })
  }
}

export function useCreateStage() {
  const invalidate = useInvalidateStages()
  return useMutation({
    mutationFn: async ({ pipelineId, ...body }: StageCreateBody & { pipelineId: string }) =>
      unwrap(await api.api.v1.pipelines({ id: pipelineId }).stages.post(body)),
    onSuccess: (stage) => invalidate(stage.pipelineId),
    onError: toastApiError,
  })
}

export function useUpdateStage() {
  const invalidate = useInvalidateStages()
  return useMutation({
    mutationFn: async ({ id, ...body }: StageUpdateBody & { id: string }) =>
      unwrap(await api.api.v1.stages({ id }).put(body)),
    onSuccess: (stage) => invalidate(stage.pipelineId),
    onError: toastApiError,
  })
}

export function useDeleteStage() {
  const invalidate = useInvalidateStages()
  return useMutation({
    mutationFn: async ({ id, moveCardsTo }: { id: string; pipelineId: string; moveCardsTo?: string }) =>
      unwrap(
        await api.api.v1.stages({ id }).delete(undefined, {
          query: moveCardsTo ? { moveCardsTo } : {},
        }),
      ),
    onSuccess: (_, { pipelineId }) => invalidate(pipelineId),
    onError: toastApiError,
  })
}

export function useReorderStages() {
  const invalidate = useInvalidateStages()
  return useMutation({
    mutationFn: async ({ pipelineId, stageIds }: { pipelineId: string; stageIds: string[] }) =>
      unwrap(await api.api.v1.pipelines({ id: pipelineId }).stages.reorder.patch({ stageIds })),
    onSuccess: (_, { pipelineId }) => invalidate(pipelineId),
    onError: toastApiError,
  })
}
