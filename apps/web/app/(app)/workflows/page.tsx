import { WorkflowIcon } from "lucide-react"

import { PagePlaceholder } from "@/shared/ui/page-placeholder"

export default function WorkflowsPage() {
  return (
    <PagePlaceholder
      title="Workflows"
      icon={WorkflowIcon}
      description="Editor visual de automações — gatilho, condição e ação."
    />
  )
}
