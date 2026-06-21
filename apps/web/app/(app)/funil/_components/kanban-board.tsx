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
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable"

import {
  accentKey,
  type LeadCard,
  PIPELINES,
  type Stage,
} from "../_data/pipelines"
import { KanbanColumn } from "./kanban-column"
import { FunilToolbar } from "./funil-toolbar"
import { LeadCardView } from "./lead-card"
import { StageAutomationPanel } from "./stage-automation-panel"

/** Encontra o stage que contém um card pelo id. */
function findStageByCard(stages: Stage[], cardId: string): Stage | undefined {
  return stages.find((s) => s.cards.some((c) => c.id === cardId))
}

export function KanbanBoard() {
  const [pipelineId, setPipelineId] = React.useState(PIPELINES[0]!.id)
  const [stages, setStages] = React.useState<Stage[]>(
    () => structuredClone(PIPELINES[0]!.stages)
  )

  // Filtros (mock) — busca, canal, responsável.
  const [query, setQuery] = React.useState("")
  const [channelFilter, setChannelFilter] = React.useState("all")
  const [ownerFilter, setOwnerFilter] = React.useState("all")

  // Painel de automações.
  const [panelStageId, setPanelStageId] = React.useState<string | null>(null)
  const [panelOpen, setPanelOpen] = React.useState(false)

  // Drag.
  const [activeCard, setActiveCard] = React.useState<LeadCard | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function switchPipeline(id: string) {
    const pipeline = PIPELINES.find((p) => p.id === id)
    if (!pipeline) return
    setPipelineId(id)
    setStages(structuredClone(pipeline.stages))
    setPanelOpen(false)
    setPanelStageId(null)
  }

  // Filtragem só para exibição — não muta o estado-fonte dos stages.
  const visibleStages = React.useMemo<Stage[]>(() => {
    const q = query.trim().toLowerCase()
    return stages.map((stage) => ({
      ...stage,
      cards: stage.cards.filter((card) => {
        const matchesQuery =
          !q ||
          card.contactName.toLowerCase().includes(q) ||
          card.subtitle.toLowerCase().includes(q) ||
          card.tags.some((t) => t.toLowerCase().includes(q))
        const matchesChannel =
          channelFilter === "all" || card.channel === channelFilter
        const matchesOwner =
          ownerFilter === "all" || card.ownerId === ownerFilter
        return matchesQuery && matchesChannel && matchesOwner
      }),
    }))
  }, [stages, query, channelFilter, ownerFilter])

  const panelStage = stages.find((s) => s.id === panelStageId) ?? null

  function handleDragStart(event: DragStartEvent) {
    const card = event.active.data.current?.card as LeadCard | undefined
    if (card) setActiveCard(card)
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

      // Coluna de destino: ou o id de uma coluna, ou o stage do card sob o cursor.
      const overStage =
        prev.find((s) => s.id === overId) ?? findStageByCard(prev, overId)
      if (!overStage) return prev
      if (fromStage.id === overStage.id) return prev

      const card = fromStage.cards.find((c) => c.id === activeId)
      if (!card) return prev

      const overIndex = overStage.cards.findIndex((c) => c.id === overId)
      const insertAt = overIndex >= 0 ? overIndex : overStage.cards.length

      return prev.map((stage) => {
        if (stage.id === fromStage.id) {
          return {
            ...stage,
            cards: stage.cards.filter((c) => c.id !== activeId),
          }
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

  /** Finaliza: reordena dentro da coluna e carimba entered_stage_at (mover = trigger). */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCard(null)
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    setStages((prev) => {
      const stage = findStageByCard(prev, activeId)
      if (!stage) return prev

      const oldIndex = stage.cards.findIndex((c) => c.id === activeId)
      const overIndex = stage.cards.findIndex((c) => c.id === overId)
      const newIndex = overIndex >= 0 ? overIndex : stage.cards.length - 1

      if (oldIndex === newIndex) return prev

      return prev.map((s) =>
        s.id === stage.id
          ? { ...s, cards: arrayMove(s.cards, oldIndex, newIndex) }
          : s
      )
    })
  }

  function openAutomations(stage: Stage) {
    setPanelStageId(stage.id)
    setPanelOpen(true)
  }

  function toggleTrigger(stageId: string, triggerId: string) {
    setStages((prev) =>
      prev.map((s) =>
        s.id === stageId
          ? {
              ...s,
              triggers: s.triggers.map((t) =>
                t.id === triggerId ? { ...t, enabled: !t.enabled } : t
              ),
            }
          : s
      )
    )
  }

  function toggleRobot(stageId: string, robotId: string) {
    setStages((prev) =>
      prev.map((s) =>
        s.id === stageId
          ? {
              ...s,
              robots: s.robots.map((r) =>
                r.id === robotId ? { ...r, enabled: !r.enabled } : r
              ),
            }
          : s
      )
    )
  }

  // "Novo card" / "Automações" da toolbar abrem o painel da primeira etapa.
  function openFirstStageAutomations() {
    const first = stages[0]
    if (first) openAutomations(first)
  }

  return (
    <div className="flex h-full flex-col">
      <FunilToolbar
        pipelineId={pipelineId}
        onPipelineChange={switchPipeline}
        query={query}
        onQueryChange={setQuery}
        channelFilter={channelFilter}
        onChannelFilterChange={setChannelFilter}
        ownerFilter={ownerFilter}
        onOwnerFilterChange={setOwnerFilter}
        onOpenAutomations={openFirstStageAutomations}
      />

      <div className="min-h-0 flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveCard(null)}
        >
          <div className="flex h-full items-stretch gap-3 px-4 py-3">
            {visibleStages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                onOpenAutomations={openAutomations}
                onAddCard={(id) => {
                  const s = stages.find((st) => st.id === id)
                  if (s) openAutomations(s)
                }}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeCard ? (
              <div className="w-72">
                <LeadCardView
                  card={activeCard}
                  accentKey={accentKey(
                    (findStageByCard(stages, activeCard.id) ?? stages[0]!)
                      .accent
                  )}
                  overlay
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <StageAutomationPanel
        stage={panelStage}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onToggleTrigger={toggleTrigger}
        onToggleRobot={toggleRobot}
      />
    </div>
  )
}
