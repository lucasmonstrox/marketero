import { ArrowRightIcon, BotIcon, FileTextIcon, MegaphoneIcon } from "lucide-react"

import { Card } from "@workspace/ui/components/card"

/**
 * Banner explicativo do modelo central (agentes.md §1): Form = programa
 * (perguntas), Agente = motor (IA que conduz via FSM), Campanha = bind
 * (agente, form, canal, audiência). Ancorar o usuário antes da tabela.
 */

const PIECES = [
  {
    icon: FileTextIcon,
    label: "Form",
    role: "o programa",
    desc: "O conjunto de perguntas a capturar + consentimento.",
  },
  {
    icon: BotIcon,
    label: "Agente",
    role: "o motor",
    desc: "A IA que conduz o Form em diálogo, via FSM.",
  },
  {
    icon: MegaphoneIcon,
    label: "Campanha",
    role: "o bind",
    desc: "Amarra agente, form, canal e audiência.",
  },
] as const

export function BindExplainer() {
  return (
    <Card size="sm" className="bg-muted/40">
      <div className="flex flex-col gap-3 px-3 sm:flex-row sm:items-stretch sm:gap-2">
        {PIECES.map((piece, index) => (
          <div key={piece.label} className="flex flex-1 items-stretch gap-2">
            <div className="flex flex-1 items-start gap-2.5">
              <div className="bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-foreground/10">
                <piece.icon className="size-4" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm leading-none font-medium">
                  {piece.label}{" "}
                  <span className="text-muted-foreground font-normal">
                    — {piece.role}
                  </span>
                </p>
                <p className="text-muted-foreground text-xs">{piece.desc}</p>
              </div>
            </div>
            {index < PIECES.length - 1 ? (
              <ArrowRightIcon
                className="text-muted-foreground/50 hidden size-4 shrink-0 self-center sm:block"
                aria-hidden="true"
              />
            ) : null}
          </div>
        ))}
      </div>
      <p className="text-muted-foreground border-t px-3 pt-3 text-xs">
        <span className="text-foreground font-medium">1 agente, N campanhas:</span>{" "}
        o mesmo agente roda um Form diferente por campanha — troca o roteiro de
        perguntas sem trocar de motor.
      </p>
    </Card>
  )
}
