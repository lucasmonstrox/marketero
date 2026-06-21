import { BarChart3Icon } from "lucide-react"

import { PagePlaceholder } from "@/shared/ui/page-placeholder"

export default function MetricasPage() {
  return (
    <PagePlaceholder
      title="Métricas"
      icon={BarChart3Icon}
      description="Dashboards e métricas unificadas de todos os canais."
    />
  )
}
