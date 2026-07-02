"use client"

import * as React from "react"
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { PlusIcon, RotateCwIcon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea, ScrollBar } from "@workspace/ui/components/scroll-area"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { useBoard } from "@/shared/api/use-board"
import { useIsMovingCard, useMoveCard } from "@/shared/api/use-cards"
import { useContactsMap } from "@/shared/api/use-contacts"
import { useDeletePipeline, usePipelines } from "@/shared/api/use-pipelines"
import { useReorderStages } from "@/shared/api/use-stages"

import { accentKey } from "../_lib/accents"
import { adaptBoard, type UiCard, type UiStage } from "../_lib/board-adapter"
import { CardEditDialog } from "./card-edit-dialog"
import { ContactsDialog } from "./contacts-dialog"
import { DeleteStageAlert } from "./delete-stage-alert"
import { FunilToolbar } from "./funil-toolbar"
import { KanbanColumn } from "./kanban-column"
import { LeadCardView } from "./lead-card"
import { NewCardDialog } from "./new-card-dialog"
import { PipelineDialog } from "./pipeline-dialog"
import { StageAutomationPanel } from "./stage-automation-panel"
import { StageDialog } from "./stage-dialog"

/** Encontra o stage que contém um card pelo id. */
function findStageByCard(stages: UiStage[], cardId: string): UiStage | undefined {
  return stages.find((s) => s.cards.some((c) => c.id === cardId))
}

export function KanbanBoard() {
  const pipelinesQuery = usePipelines()
  const pipelines = pipelinesQuery.data ?? []

  // Seleção: null até o usuário escolher → cai na default (ou primeira).
  const [selectedPipelineId, setSelectedPipelineId] = React.useState<string | null>(null)
  const pipelineId =
    (selectedPipelineId && pipelines.some((p) => p.id === selectedPipelineId)
      ? selectedPipelineId
      : null) ??
    pipelines.find((p) => p.isDefault)?.id ??
    pipelines[0]?.id ??
    null

  const boardQuery = useBoard(pipelineId)
  const { contactsById } = useContactsMap()

  const adapted = React.useMemo(
    () => (boardQuery.data ? adaptBoard(boardQuery.data, contactsById) : null),
    [boardQuery.data, contactsById],
  )

  /**
   * Estado local dos stages = camada otimista do dnd-kit (preview cross-column
   * exige mutação local durante o arraste). Resync servidor→local só quando
   * não há drag ativo nem move em voo — o refetch do onSettled do move (ou o
   * rollback do onError) aterrissa aqui. setState-durante-render é o padrão
   * oficial do React para estado derivado de props.
   */
  const [stages, setStages] = React.useState<UiStage[]>([])
  const [activeCard, setActiveCard] = React.useState<UiCard | null>(null)
  const isMoving = useIsMovingCard()
  const lastSyncedRef = React.useRef<UiStage[] | null>(null)
  if (adapted && adapted !== lastSyncedRef.current && !activeCard && !isMoving) {
    lastSyncedRef.current = adapted
    setStages(adapted)
  }

  // Filtros — busca, canal, responsável (só exibição).
  const [query, setQuery] = React.useState("")
  const [channelFilter, setChannelFilter] = React.useState("all")
  const [ownerFilter, setOwnerFilter] = React.useState("all")

  // Painel de automações (UI-only).
  const [panelStageId, setPanelStageId] = React.useState<string | null>(null)
  const [panelOpen, setPanelOpen] = React.useState(false)

  // Dialogs.
  const [newCardOpen, setNewCardOpen] = React.useState(false)
  const [editingCard, setEditingCard] = React.useState<UiCard | null>(null)
  const [stageDialog, setStageDialog] = React.useState<{ stage: UiStage | null } | null>(null)
  const [deletingStage, setDeletingStage] = React.useState<UiStage | null>(null)
  const [pipelineDialog, setPipelineDialog] = React.useState<"create" | "rename" | null>(null)
  const [deletePipelineOpen, setDeletePipelineOpen] = React.useState(false)
  const [contactsOpen, setContactsOpen] = React.useState(false)

  const moveCard = useMoveCard()
  const reorderStages = useReorderStages()
  const deletePipeline = useDeletePipeline()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Origem do drag (stage + índice) para detectar no-op no drop.
  const dragOriginRef = React.useRef<{ stageId: string; index: number } | null>(null)

  const currentPipeline = pipelines.find((p) => p.id === pipelineId) ?? null

  // Responsáveis distintos do board (filtro derivado dos dados reais).
  const owners = React.useMemo(() => {
    const set = new Set<string>()
    for (const stage of stages) for (const card of stage.cards) {
      if (card.ownerName) set.add(card.ownerName)
    }
    return [...set].sort()
  }, [stages])

  // Filtragem só para exibição — não muta o estado-fonte dos stages.
  const visibleStages = React.useMemo<UiStage[]>(() => {
    const q = query.trim().toLowerCase()
    return stages.map((stage) => ({
      ...stage,
      cards: stage.cards.filter((card) => {
        const matchesQuery =
          !q ||
          card.contactName.toLowerCase().includes(q) ||
          card.subtitle.toLowerCase().includes(q) ||
          card.tags.some((t) => t.toLowerCase().includes(q))
        const matchesChannel = channelFilter === "all" || card.channel === channelFilter
        const matchesOwner = ownerFilter === "all" || card.ownerName === ownerFilter
        return matchesQuery && matchesChannel && matchesOwner
      }),
    }))
  }, [stages, query, channelFilter, ownerFilter])

  const panelStage = stages.find((s) => s.id === panelStageId) ?? null

  function switchPipeline(id: string) {
    setSelectedPipelineId(id)
    setPanelOpen(false)
    setPanelStageId(null)
  }

  function handleDragStart(event: DragStartEvent) {
    const card = event.active.data.current?.card as UiCard | undefined
    if (!card) return
    setActiveCard(card)
    const stage = findStageByCard(stages, card.id)
    dragOriginRef.current = stage
      ? { stageId: stage.id, index: stage.cards.findIndex((c) => c.id === card.id) }
      : null
  }

  /** Move o card entre colunas DURANTE o arraste (preview ao vivo). */
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    setStages((prev) => {
      const fromStage = findStageByCard(prev, activeId)
      if (!fromStage) return prev

      const overStage = prev.find((s) => s.id === overId) ?? findStageByCard(prev, overId)
      if (!overStage) return prev
      if (fromStage.id === overStage.id) return prev

      const card = fromStage.cards.find((c) => c.id === activeId)
      if (!card) return prev

      const overIndex = overStage.cards.findIndex((c) => c.id === overId)
      const insertAt = overIndex >= 0 ? overIndex : overStage.cards.length

      return prev.map((stage) => {
        if (stage.id === fromStage.id) {
          return { ...stage, cards: stage.cards.filter((c) => c.id !== activeId) }
        }
        if (stage.id === overStage.id) {
          const next = [...stage.cards]
          next.splice(insertAt, 0, card)
          return { ...stage, cards: next }
        }
        return stage
      })
    })
  }

  /** Finaliza: reordena localmente e persiste via POST /cards/:id/move. */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCard(null)
    const origin = dragOriginRef.current
    dragOriginRef.current = null
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Reorder final dentro da coluna atual (o cross-column já rolou no dragOver).
    const stage = findStageByCard(stages, activeId)
    if (!stage) return

    const oldIndex = stage.cards.findIndex((c) => c.id === activeId)
    const overIndex = stage.cards.findIndex((c) => c.id === overId)
    const newIndex = overIndex >= 0 ? overIndex : stage.cards.length - 1

    const next =
      oldIndex === newIndex
        ? stages
        : stages.map((s) =>
            s.id === stage.id ? { ...s, cards: arrayMove(s.cards, oldIndex, newIndex) } : s,
          )
    if (next !== stages) setStages(next)

    // Persistência: no-op se voltou para a origem na mesma posição.
    const finalStage = findStageByCard(next, activeId)!
    const finalIndex = finalStage.cards.findIndex((c) => c.id === activeId)
    if (origin && origin.stageId === finalStage.id && origin.index === finalIndex) return

    moveCard.mutate({ id: activeId, toStageId: finalStage.id, position: finalIndex })
  }

  function handleMoveStage(stageId: string, direction: -1 | 1) {
    if (!pipelineId) return
    const ids = stages.map((s) => s.id)
    const from = ids.indexOf(stageId)
    const to = from + direction
    if (from < 0 || to < 0 || to >= ids.length) return
    reorderStages.mutate({ pipelineId, stageIds: arrayMove(ids, from, to) })
  }

  function toggleTrigger(stageId: string, triggerId: string) {
    setStages((prev) =>
      prev.map((s) =>
        s.id === stageId
          ? {
              ...s,
              triggers: s.triggers.map((t) =>
                t.id === triggerId ? { ...t, enabled: !t.enabled } : t,
              ),
            }
          : s,
      ),
    )
  }

  function toggleRobot(stageId: string, robotId: string) {
    setStages((prev) =>
      prev.map((s) =>
        s.id === stageId
          ? {
              ...s,
              robots: s.robots.map((r) =>
                r.id === robotId ? { ...r, enabled: !r.enabled } : r,
              ),
            }
          : s,
      ),
    )
  }

  const loading = pipelinesQuery.isPending || boardQuery.isPending
  const error = pipelinesQuery.error ?? boardQuery.error

  return (
    <div className="flex h-full flex-col">
      <FunilToolbar
        pipelines={pipelines}
        pipelineId={pipelineId}
        onPipelineChange={switchPipeline}
        onNewPipeline={() => setPipelineDialog("create")}
        onRenamePipeline={() => setPipelineDialog("rename")}
        onDeletePipeline={() => setDeletePipelineOpen(true)}
        owners={owners}
        query={query}
        onQueryChange={setQuery}
        channelFilter={channelFilter}
        onChannelFilterChange={setChannelFilter}
        ownerFilter={ownerFilter}
        onOwnerFilterChange={setOwnerFilter}
        onOpenAutomations={() => {
          const first = stages[0]
          if (first) {
            setPanelStageId(first.id)
            setPanelOpen(true)
          }
        }}
        onNewCard={() => setNewCardOpen(true)}
        onOpenContacts={() => setContactsOpen(true)}
      />

      {/* ScrollArea (shadcn) no eixo horizontal — o filho direto do viewport
          Radix é display:table, então forçamos h-full para a cadeia de altura
          das colunas não quebrar. */}
      <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:h-full">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar o funil. A API está rodando?
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void pipelinesQuery.refetch()
                void boardQuery.refetch()
              }}
            >
              <RotateCwIcon className="size-3.5" />
              Tentar novamente
            </Button>
          </div>
        ) : loading ? (
          <div className="flex h-full items-stretch gap-3 px-4 py-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="flex h-full w-72 shrink-0 flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3"
              >
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-2 h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
              setActiveCard(null)
              dragOriginRef.current = null
              // Descarta o preview local — volta ao último snapshot do server.
              if (lastSyncedRef.current) setStages(lastSyncedRef.current)
            }}
          >
            <div className="flex h-full items-stretch gap-3 px-4 py-3">
              {visibleStages.map((stage, index) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  index={index}
                  stageCount={visibleStages.length}
                  onOpenAutomations={(s) => {
                    setPanelStageId(s.id)
                    setPanelOpen(true)
                  }}
                  onAddCard={() => setNewCardOpen(true)}
                  onCardClick={setEditingCard}
                  onEditStage={(s) => setStageDialog({ stage: s })}
                  onMoveStage={handleMoveStage}
                  onDeleteStage={setDeletingStage}
                />
              ))}

              {/* Coluna fantasma — nova etapa no fim do board */}
              <button
                type="button"
                onClick={() => setStageDialog({ stage: null })}
                className="flex h-full w-72 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <PlusIcon className="size-4" />
                Nova etapa
              </button>
            </div>

            <DragOverlay dropAnimation={null}>
              {activeCard ? (
                <div className="w-72">
                  <LeadCardView
                    card={activeCard}
                    accentKey={accentKey(
                      (findStageByCard(stages, activeCard.id) ?? stages[0])?.accent ?? {
                        kind: "chart",
                        n: 1,
                      },
                    )}
                    overlay
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <StageAutomationPanel
        stage={panelStage}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onToggleTrigger={toggleTrigger}
        onToggleRobot={toggleRobot}
      />

      {pipelineId ? (
        <>
          <NewCardDialog open={newCardOpen} onOpenChange={setNewCardOpen} pipelineId={pipelineId} />
          <CardEditDialog
            card={editingCard}
            pipelineId={pipelineId}
            onOpenChange={(open) => !open && setEditingCard(null)}
          />
          <StageDialog
            open={Boolean(stageDialog)}
            onOpenChange={(open) => !open && setStageDialog(null)}
            pipelineId={pipelineId}
            stage={stageDialog?.stage}
          />
          <DeleteStageAlert
            stage={deletingStage}
            pipelineId={pipelineId}
            otherStages={stages.filter((s) => s.id !== deletingStage?.id)}
            onOpenChange={(open) => !open && setDeletingStage(null)}
          />
        </>
      ) : null}

      <PipelineDialog
        open={Boolean(pipelineDialog)}
        onOpenChange={(open) => !open && setPipelineDialog(null)}
        pipeline={pipelineDialog === "rename" ? currentPipeline : null}
        onCreated={switchPipeline}
      />

      <AlertDialog open={deletePipelineOpen} onOpenChange={setDeletePipelineOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{currentPipeline?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Só pipelines vazias e não-padrão podem ser excluídas — a API
              bloqueia o resto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePipeline.isPending}
              onClick={() => {
                if (!pipelineId) return
                deletePipeline.mutate(pipelineId, {
                  onSuccess: () => {
                    setDeletePipelineOpen(false)
                    setSelectedPipelineId(null) // volta para a default
                  },
                })
              }}
            >
              Excluir pipeline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ContactsDialog open={contactsOpen} onOpenChange={setContactsOpen} />
    </div>
  )
}
