/**
 * Prova EM COMPILE-TIME que os tipos do Eden vieram do servidor (e não caíram
 * para `any`). Se alguém introduzir um path alias no apps/api e quebrar a
 * inferência, os `@ts-expect-error` abaixo deixam de errar e o typecheck falha.
 * Nunca é executado — só compilado.
 */
import { api } from "./index"

async function verify(): Promise<void> {
  const { data } = await api.api.v1.pipelines.get()
  if (data) {
    // Tipado de verdade: `name` existe…
    const name: string = data[0]!.name
    void name
    // …e um campo inventado NÃO compila (falharia se data fosse `any`).
    // @ts-expect-error — campo inexistente no PipelineResponse
    void data[0]!.totallyFakeField
  }

  const move = await api.api.v1.cards({ id: "x" }).move.post({ toStageId: "y" })
  if (move.data) {
    const moved: boolean = move.data.moved
    void moved
    // @ts-expect-error — MoveResponse não tem esse campo
    void move.data.bogus
  }
}

void verify
