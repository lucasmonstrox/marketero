"use client"

/** Board completo de um pipeline (colunas + cards ordenados). */
import { useQuery } from "@tanstack/react-query"
import { api } from "@workspace/api-client"

import { unwrap } from "./errors"
import { queryKeys } from "./keys"

export function useBoard(pipelineId: string | null) {
  return useQuery({
    queryKey: queryKeys.board(pipelineId ?? ""),
    queryFn: async () => unwrap(await api.api.v1.pipelines({ id: pipelineId! }).board.get()),
    enabled: pipelineId !== null,
  })
}
