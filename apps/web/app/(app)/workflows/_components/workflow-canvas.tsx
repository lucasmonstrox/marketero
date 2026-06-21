"use client"

import { useCallback, useMemo, useState } from "react"

import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  type EdgeMouseHandler,
  MarkerType,
  MiniMap,
  type NodeMouseHandler,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react"
import { useTheme } from "next-themes"

import "@xyflow/react/dist/style.css"

import { cn } from "@workspace/ui/lib/utils"

import {
  ActionNode,
  AINode,
  ConditionNode,
  TriggerNode,
} from "./flow-nodes"
import { NodeInspector } from "./node-inspector"
import { NodePalette } from "./node-palette"
import { WorkflowToolbar } from "./workflow-toolbar"
import { PALETTE_GROUPS } from "../_data/palette"
import { initialEdges, initialNodes } from "../_data/flow"
import type { BaseNodeData, FlowNode, PaletteItem } from "../_data/types"

/** Mapa de tipos em ESCOPO DE MÓDULO → identidade estável (regra React Flow). */
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  ai: AINode,
  condition: ConditionNode,
  action: ActionNode,
}

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
}

/**
 * Mapeia o chrome do React Flow (edges, controls, minimap, attribution, handles,
 * grade do fundo) para os TOKENS do design system via CSS custom properties
 * `--xy-*`. Assim dark/light seguem `colorMode` + a paleta da marca, sem hex cru.
 */
const flowTokenStyle = {
  "--xy-edge-stroke": "var(--border)",
  "--xy-edge-stroke-selected": "var(--primary)",
  "--xy-connectionline-stroke": "var(--ring)",
  "--xy-handle-background-color": "var(--muted-foreground)",
  "--xy-handle-border-color": "var(--card)",
  "--xy-background-pattern-dots-color": "var(--border)",
  "--xy-controls-button-background-color": "var(--card)",
  "--xy-controls-button-background-color-hover": "var(--muted)",
  "--xy-controls-button-color": "var(--muted-foreground)",
  "--xy-controls-button-color-hover": "var(--foreground)",
  "--xy-controls-button-border-color": "var(--border)",
  "--xy-minimap-background-color": "var(--card)",
  "--xy-minimap-mask-background-color": "var(--muted)",
  "--xy-minimap-node-background-color": "var(--muted-foreground)",
  "--xy-edge-label-background-color": "var(--card)",
  "--xy-edge-label-color": "var(--foreground)",
  "--xy-attribution-background-color": "var(--muted)",
} as React.CSSProperties

let nodeSeq = 100

function nextId(prefix: string) {
  nodeSeq += 1
  return `${prefix}-${nodeSeq}`
}

function FlowCanvas() {
  const { resolvedTheme } = useTheme()
  const { screenToFlowPosition } = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges)
  const [selectedId, setSelectedId] = useState<string | null>("n-classify")
  const [testMode, setTestMode] = useState(false)

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedId) ?? null,
    [nodes, selectedId]
  )

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, ...defaultEdgeOptions }, eds)),
    [setEdges]
  )

  const onNodeClick = useCallback<NodeMouseHandler<FlowNode>>(
    (_event, node) => setSelectedId(node.id),
    []
  )

  const onEdgeClick = useCallback<EdgeMouseHandler>(
    () => setSelectedId(null),
    []
  )

  const onPaneClick = useCallback(() => setSelectedId(null), [])

  /** Cria um nó a partir de um item do palette, próximo ao centro visível. */
  const addNode = useCallback(
    (item: PaletteItem, position?: { x: number; y: number }) => {
      const id = nextId(item.kind)
      const newNode: FlowNode = {
        id,
        type: item.kind,
        position: position ?? {
          x: 320 + Math.random() * 120,
          y: 120 + Math.random() * 200,
        },
        data: {
          kind: item.kind,
          template: item.template,
          title: item.label,
          subtitle: item.hint,
          channel: item.channel,
        },
      }
      setNodes((nds) => [...nds, newNode])
      setSelectedId(id)
    },
    [setNodes]
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const template = event.dataTransfer.getData("application/marketero-node")
      if (!template) return
      const item = PALETTE_GROUPS.flatMap((g) => g.items).find(
        (candidate) => candidate.template === template
      )
      if (!item) return
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      addNode(item, position)
    },
    [addNode, screenToFlowPosition]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const patchSelected = useCallback(
    (patch: Partial<BaseNodeData>) => {
      if (!selectedId) return
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedId
            ? { ...node, data: { ...node.data, ...patch } }
            : node
        )
      )
    },
    [selectedId, setNodes]
  )

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    setNodes((nds) => nds.filter((node) => node.id !== selectedId))
    setEdges((eds) =>
      eds.filter(
        (edge) => edge.source !== selectedId && edge.target !== selectedId
      )
    )
    setSelectedId(null)
  }, [selectedId, setEdges, setNodes])

  const colorMode = resolvedTheme === "dark" ? "dark" : "light"

  return (
    <div className="flex h-full flex-col">
      <WorkflowToolbar
        name="Lead Ads → Qualificação → CAPI"
        status="active"
        testMode={testMode}
        onTestModeChange={setTestMode}
        canUndo
        canRedo={false}
        onUndo={() => undefined}
        onRedo={() => undefined}
        onSave={() => undefined}
      />

      <div className="flex min-h-0 flex-1">
        <NodePalette onAdd={(item) => addNode(item)} />

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className={cn(
            "relative min-w-0 flex-1",
            testMode && "ring-ai/40 ring-inset ring-2"
          )}
          style={flowTokenStyle}
        >
          {testMode ? (
            <div className="bg-ai/10 text-ai border-ai-border pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-full border px-3 py-1 text-xs font-medium">
              Modo simulação — nenhuma ação real será executada
            </div>
          ) : null}

          <ReactFlow<FlowNode>
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            colorMode={colorMode}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            proOptions={{ hideAttribution: true }}
            className="bg-background"
            minZoom={0.3}
            maxZoom={1.5}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1.5}
            />
            <Controls
              className="!rounded-lg !border !border-border !shadow-sm"
              showInteractive={false}
            />
            <MiniMap<FlowNode>
              pannable
              zoomable
              className="!rounded-lg !border !border-border"
              nodeColor={miniMapNodeColor}
              maskColor="var(--xy-minimap-mask-background-color)"
            />
          </ReactFlow>
        </div>

        <NodeInspector
          node={selectedNode}
          onPatch={patchSelected}
          onDelete={deleteSelected}
        />
      </div>
    </div>
  )
}

/** Cor do nó no minimapa por família — lê tokens via CSS vars resolvidas. */
function miniMapNodeColor(node: FlowNode): string {
  switch (node.data.kind) {
    case "ai":
      return "var(--ai)"
    case "trigger":
      return "var(--info)"
    case "condition":
      return "var(--warning)"
    case "action":
      return "var(--success)"
    default:
      return "var(--muted-foreground)"
  }
}

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  )
}
