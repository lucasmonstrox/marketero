import { LayoutDashboardIcon } from "lucide-react"

import { PagePlaceholder } from "@/shared/ui/page-placeholder"

export default function VisaoGeralPage() {
  return (
    <PagePlaceholder
      title="Visão geral"
      icon={LayoutDashboardIcon}
      description="Seu painel inicial — visão consolidada de marketing, vendas e atendimento."
    />
  )
}
