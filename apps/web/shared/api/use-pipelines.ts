"use client"

/** Hooks de pipelines: listagem + CRUD, invalidando `["pipelines"]`. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@workspace/api-client"

import { toastApiError, unwrap } from "./errors"
import { queryKeys } from "./keys"

type PipelineCreateBody = Parameters<typeof api.api.v1.pipelines.post>[0]

export function usePipelines() {
  return useQuery({
    queryKey: queryKeys.pipelines,
    queryFn: async () => unwrap(await api.api.v1.pipelines.get()),
  })
}

export function useCreatePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: PipelineCreateBody) => unwrap(await api.api.v1.pipelines.post(body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.pipelines }),
    onError: toastApiError,
  })
}

export function useRenamePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) =>
      unwrap(await api.api.v1.pipelines({ id }).put({ name })),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.pipelines }),
    onError: toastApiError,
  })
}

export function useDeletePipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await api.api.v1.pipelines({ id }).delete()),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.pipelines }),
    onError: toastApiError,
  })
}
