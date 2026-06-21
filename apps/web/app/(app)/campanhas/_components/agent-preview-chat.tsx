"use client"

import * as React from "react"
import {
  CheckCheckIcon,
  ChevronRightIcon,
  CornerDownLeftIcon,
  RotateCcwIcon,
  SparklesIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"

import { AiTag } from "@/shared/ui/ai-tag"
import { type SemanticTone, TONE_BADGE } from "@/shared/domain/taxonomy"

import type { Agent } from "../_data/agents"
import { getForm } from "../_data/forms"
import {
  type ConversationMessage,
  type FsmState,
  PREVIEW_CONVERSATION,
  PREVIEW_STATE_META,
  type SlotKey,
  type SlotPatch,
} from "../_data/preview-conversation"
import { SlotInspector } from "./slot-inspector"

/** Mapeia o tom de automação do estado para os tokens de badge soft. */
const STATE_TONE: Record<FsmState, SemanticTone> = {
  welcome: "muted",
  collect: "info",
  digress: "warning",
  validate: "info",
  review: "info",
  consent: "warning",
  complete: "success",
}

const STATE_FLOW: FsmState[] = [
  "welcome",
  "collect",
  "validate",
  "review",
  "consent",
  "complete",
]

/**
 * AgentPreviewChat — a vitrine do agentes.md: um preview onde o Agente conduz um
 * Form via FSM. Esquerda: a conversa (welcome → coleta slot a slot em NL →
 * valida → gate de consentimento → complete), com as falas do bot marcadas como
 * IA (--ai). Direita: o SlotInspector preenchendo ao vivo + o gate de
 * consentimento (LGPD). O chip mostra o estado atual da FSM.
 *
 * O usuário avança o roteiro fictício com "Próxima resposta do lead".
 */
export function AgentPreviewChat({ agent }: { agent: Agent }) {
  const form = getForm(agent.defaultFormId)
  const consentRequired = form?.consent.required ?? true

  const [stepIndex, setStepIndex] = React.useState(0)
  const [consentAccepted, setConsentAccepted] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const lastIndex = PREVIEW_CONVERSATION.length - 1
  const currentStep = PREVIEW_CONVERSATION[stepIndex]!
  const currentState = currentStep.state

  // Mensagens visíveis = acumulado até o passo atual.
  const messages = React.useMemo<ConversationMessage[]>(
    () =>
      PREVIEW_CONVERSATION.slice(0, stepIndex + 1).flatMap(
        (step) => step.messages
      ),
    [stepIndex]
  )

  // Slots capturados = merge dos fills até o passo atual.
  const slots = React.useMemo<Record<SlotKey, SlotPatch | undefined>>(() => {
    const acc = {} as Record<SlotKey, SlotPatch | undefined>
    for (const step of PREVIEW_CONVERSATION.slice(0, stepIndex + 1)) {
      for (const fill of step.fills ?? []) {
        acc[fill.key] = fill
      }
    }
    return acc
  }, [stepIndex])

  // O gate de consentimento abre quando a FSM chega (ou passa) por `consent`.
  const consentEnabled = PREVIEW_CONVERSATION.slice(0, stepIndex + 1).some(
    (step) => step.consentGate
  )

  const nextStep = stepIndex < lastIndex ? PREVIEW_CONVERSATION[stepIndex + 1] : null
  // Não deixa concluir (avançar para `complete`) sem o aceite — gate duro.
  const blockedByConsent =
    nextStep?.state === "complete" && consentRequired && !consentAccepted
  const isFinished = stepIndex >= lastIndex

  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [stepIndex])

  function advance() {
    if (!isFinished && !blockedByConsent) setStepIndex((i) => i + 1)
  }

  function restart() {
    setStepIndex(0)
    setConsentAccepted(false)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <SparklesIcon className="text-ai size-4" aria-hidden="true" />
          Testar agente — {agent.name}
        </DialogTitle>
        <DialogDescription>
          Preview do agente conduzindo o Form{" "}
          <span className="text-foreground font-medium">
            “{form?.name ?? "—"}”
          </span>{" "}
          via máquina de estados (FSM). Conversa fictícia.
        </DialogDescription>
      </DialogHeader>

      <FsmStateChips current={currentState} />

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        {/* Coluna do chat */}
        <div className="flex min-h-0 flex-col rounded-xl border bg-muted/20">
          <div ref={scrollRef} className="h-[22rem] overflow-y-auto">
            <div className="flex flex-col gap-3 p-3">
              {messages.map((message, index) => (
                <ChatBubble key={index} message={message} />
              ))}
            </div>
          </div>

          <div className="border-t p-2.5">
            {isFinished ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={restart}
              >
                <RotateCcwIcon aria-hidden="true" />
                Reiniciar conversa
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={advance}
                disabled={blockedByConsent}
                aria-disabled={blockedByConsent}
              >
                {blockedByConsent ? (
                  <>Aceite o consentimento para concluir</>
                ) : (
                  <>
                    <CornerDownLeftIcon aria-hidden="true" />
                    Próxima resposta do lead
                  </>
                )}
              </Button>
            )}
            {blockedByConsent ? (
              <p className="text-muted-foreground mt-1.5 text-center text-xs">
                A FSM trava em <span className="font-mono">consent</span> até o
                aceite obrigatório (LGPD).
              </p>
            ) : null}
          </div>
        </div>

        {/* Coluna do inspetor de slots */}
        <SlotInspector
          slots={slots}
          consentRequired={consentRequired}
          consentAccepted={consentAccepted}
          onConsentChange={setConsentAccepted}
          consentEnabled={consentEnabled}
        />
      </div>
    </>
  )
}

/** Trilha de estados da FSM com destaque no atual (design-system §7.8). */
function FsmStateChips({ current }: { current: FsmState }) {
  // `digress` é um self-loop de collect — destacamos collect quando digredindo.
  const activeAnchor: FsmState = current === "digress" ? "collect" : current
  return (
    <div className="flex flex-wrap items-center gap-1">
      {STATE_FLOW.map((state, index) => {
        const meta = PREVIEW_STATE_META[state]
        const isActive = state === activeAnchor
        return (
          <React.Fragment key={state}>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-medium transition-colors",
                isActive
                  ? TONE_BADGE[STATE_TONE[state]]
                  : "border-border text-muted-foreground/60"
              )}
              aria-current={isActive ? "step" : undefined}
            >
              {state === "complete" && isActive ? (
                <CheckCheckIcon className="size-3" aria-hidden="true" />
              ) : null}
              {meta.label}
            </span>
            {index < STATE_FLOW.length - 1 ? (
              <ChevronRightIcon
                className="text-muted-foreground/30 size-3 shrink-0"
                aria-hidden="true"
              />
            ) : null}
          </React.Fragment>
        )
      })}
      {current === "digress" ? (
        <span
          className={cn(
            "ml-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-medium",
            TONE_BADGE.warning
          )}
        >
          digress ↺
        </span>
      ) : null}
    </div>
  )
}

/** Bolha de chat: bot recebe tratamento de IA (--ai); lead, neutro. */
function ChatBubble({ message }: { message: ConversationMessage }) {
  const isBot = message.speaker === "bot"
  return (
    <div className={cn("flex flex-col gap-1", isBot ? "items-start" : "items-end")}>
      {isBot ? (
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <AiTag>Clara</AiTag>
        </div>
      ) : null}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
          isBot
            ? "border-ai-border bg-ai/10 text-foreground rounded-tl-sm border"
            : "bg-primary text-primary-foreground rounded-tr-sm"
        )}
      >
        {message.text}
      </div>
      {message.note ? (
        <p
          className={cn(
            "text-muted-foreground max-w-[85%] text-[11px] italic",
            isBot ? "text-left" : "text-right"
          )}
        >
          {message.note}
        </p>
      ) : null}
    </div>
  )
}
