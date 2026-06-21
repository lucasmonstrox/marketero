"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@workspace/ui/components/skeleton"

/**
 * Editor visual de workflows (design-system §7.4 · kanban.md §"trigger → IA →
 * ação"). O canvas é React Flow (@xyflow/react), que depende de `window`/DOM —
 * por isso carrega só no cliente (`ssr: false`), conforme a investigação de
 * workflows-visuais.md §5.7. Full-bleed: ocupa toda a `<main>` do app shell.
 */
const WorkflowCanvas = dynamic(
  () =>
    import("./_components/workflow-canvas").then((mod) => mod.WorkflowCanvas),
  {
    ssr: false,
    loading: () => <CanvasSkeleton />,
  }
)

export default function WorkflowsPage() {
  return <WorkflowCanvas />
}

function CanvasSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="bg-card flex h-12 shrink-0 items-center gap-3 border-b px-3">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="ml-auto h-7 w-20" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="bg-card w-56 shrink-0 space-y-2 border-r p-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
        <div className="bg-muted/20 flex flex-1 items-center justify-center">
          <Skeleton className="h-40 w-80" />
        </div>
        <div className="bg-card w-72 shrink-0 space-y-3 border-l p-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  )
}
