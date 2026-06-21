import { KanbanIcon } from "lucide-react"

import { PagePlaceholder } from "@/shared/ui/page-placeholder"

export default function FunilPage() {
  return (
    <PagePlaceholder
      title="Funil"
      icon={KanbanIcon}
      description="Funil de vendas em Kanban, com automações por etapa."
    />
  )
}
