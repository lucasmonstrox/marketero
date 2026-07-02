/**
 * Tratamento uniforme de erros da API (envelope `{ error, detail? }`).
 * O Eden Treaty retorna `{ data, error }` — `unwrap` converte em throw de
 * `ApiError` para o React Query propagar até `onError`/`toastApiError`.
 */
import { toast } from "sonner"

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

type EdenResult<T> = {
  data: T | null
  error: { status: unknown; value: unknown } | null
}

/** Lança ApiError quando a resposta veio com erro; senão devolve `data` tipado. */
export function unwrap<T>(res: EdenResult<T>): T {
  if (res.error) {
    const status = typeof res.error.status === "number" ? res.error.status : 0
    const value = res.error.value as { error?: string; detail?: string } | string | null
    const message =
      typeof value === "string" ? value : (value?.error ?? "Erro desconhecido")
    const detail = typeof value === "object" ? value?.detail : undefined
    throw new ApiError(status, message, detail)
  }
  return res.data as T
}

/** Mensagens pt-BR por classe de erro; detail do servidor vira descrição. */
export function toastApiError(e: unknown) {
  if (e instanceof ApiError) {
    const title =
      e.status === 409
        ? "Registro duplicado"
        : e.status === 422
          ? "Operação não permitida"
          : e.status === 404
            ? "Registro não encontrado"
            : "Erro na API"
    toast.error(title, { description: e.detail ?? e.message })
    return
  }
  toast.error("API indisponível", {
    description: "Verifique se o servidor está rodando em " + (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334"),
  })
}
