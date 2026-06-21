"use client"

import * as React from "react"
import { BotIcon, FileTextIcon, MegaphoneIcon, PlusIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { TooltipProvider } from "@workspace/ui/components/tooltip"

import { PageContainer } from "@/shared/ui/page-container"
import { PageHeader } from "@/shared/ui/page-header"

import { AGENTS } from "./_data/agents"
import { AgentCard } from "./_components/agent-card"
import { BindExplainer } from "./_components/bind-explainer"
import { CampaignsTable } from "./_components/campaigns-table"
import { FormsTable } from "./_components/forms-table"

/**
 * Campanhas + Agentes + Forms (agentes.md §7.8). Página-documento com 3 abas que
 * materializam o modelo central: Form (programa) · Agente (motor) · Campanha
 * (bind). Operadora fictícia: Ana Souza / tenant Bella Decor.
 */
export default function CampanhasPage() {
  const [tab, setTab] = React.useState("campanhas")

  return (
    <TooltipProvider delayDuration={200}>
      <PageContainer>
        <PageHeader
          title="Campanhas"
          description="Vincule agentes de IA e formulários a canais e audiências para captar leads em conversa."
        >
          <Button size="sm" asChild>
            <Link href="/builder">
              <PlusIcon aria-hidden="true" />
              Nova campanha
            </Link>
          </Button>
        </PageHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="campanhas">
              <MegaphoneIcon aria-hidden="true" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="agentes">
              <BotIcon aria-hidden="true" />
              Agentes
            </TabsTrigger>
            <TabsTrigger value="forms">
              <FileTextIcon aria-hidden="true" />
              Forms
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campanhas" className="mt-4 space-y-4">
            <BindExplainer />
            <CampaignsTable />
          </TabsContent>

          <TabsContent value="agentes" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                O motor conversacional. Um agente atende N campanhas com N forms.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/builder">
                  <PlusIcon aria-hidden="true" />
                  Novo agente
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {AGENTS.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="forms" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                O programa de perguntas que o agente conduz — e o vínculo opcional
                com os Instant Forms da Meta.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/builder">
                  <PlusIcon aria-hidden="true" />
                  Novo form
                </Link>
              </Button>
            </div>
            <FormsTable />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </TooltipProvider>
  )
}
