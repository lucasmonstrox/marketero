import { InboxIcon } from "lucide-react"

import { PagePlaceholder } from "@/shared/ui/page-placeholder"

export default function InboxPage() {
  return (
    <PagePlaceholder
      title="Inbox"
      icon={InboxIcon}
      description="Inbox unificado de DMs e comentários de todos os canais, com sugestões de IA."
    />
  )
}
