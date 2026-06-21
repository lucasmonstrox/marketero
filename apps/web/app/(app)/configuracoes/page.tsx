import { SettingsIcon } from "lucide-react"

import { PagePlaceholder } from "@/shared/ui/page-placeholder"

export default function ConfiguracoesPage() {
  return (
    <PagePlaceholder
      title="Configurações"
      icon={SettingsIcon}
      description="Preferências da conta, canais conectados e equipe."
    />
  )
}
