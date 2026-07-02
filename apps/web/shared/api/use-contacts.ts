"use client"

/**
 * Hooks de contatos. `useContactsMap` materializa um Map id→contato para o
 * board resolver nomes sem N queries (single-tenant v1, volume pequeno).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@workspace/api-client"
import * as React from "react"

import { toastApiError, unwrap } from "./errors"
import { queryKeys } from "./keys"
import type { ContactResponse } from "./types"

type ContactCreateBody = Parameters<typeof api.api.v1.contacts.post>[0]
type ContactUpdateBody = Parameters<ReturnType<typeof api.api.v1.contacts>["put"]>[0]

export function useContacts(q?: string) {
  return useQuery({
    queryKey: q ? [...queryKeys.contacts, q] : queryKeys.contacts,
    queryFn: async () =>
      unwrap(await api.api.v1.contacts.get({ query: { limit: 200, ...(q ? { q } : {}) } })),
    staleTime: 60_000,
  })
}

export function useContactsMap() {
  const query = useContacts()
  const contacts = query.data
  const contactsById = React.useMemo(
    () => new Map<string, ContactResponse>(contacts?.map((c) => [c.id, c])),
    [contacts],
  )
  return { ...query, contactsById }
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: ContactCreateBody) => unwrap(await api.api.v1.contacts.post(body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.contacts }),
    onError: toastApiError,
  })
}

export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: ContactUpdateBody & { id: string }) =>
      unwrap(await api.api.v1.contacts({ id }).put(body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.contacts }),
    onError: toastApiError,
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await api.api.v1.contacts({ id }).delete()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.contacts })
      // Cards que apontavam para o contato mostram fallback até o próximo fetch.
      void qc.invalidateQueries({ queryKey: queryKeys.boards })
    },
    onError: toastApiError,
  })
}
