"use client"

import {
  BotIcon,
  Building2Icon,
  PaletteIcon,
  PlugZapIcon,
  RadioTowerIcon,
  UsersIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { PageContainer } from "@/shared/ui/page-container"
import { PageHeader } from "@/shared/ui/page-header"
import { AiTag } from "@/shared/ui/ai-tag"

import { AiAutomationSettings } from "./_components/ai-automation-settings"
import { ChannelsSettings } from "./_components/channels-settings"
import { OrgSettings } from "./_components/org-settings"
import { SectionCard } from "./_components/section-card"
import {
  SettingsNav,
  type SettingsSection,
} from "./_components/settings-nav"
import { TeamSettings } from "./_components/team-settings"
import { WebhooksSettings } from "./_components/webhooks-settings"
import { WhiteLabelSettings } from "./_components/white-label-settings"

const SECTIONS: SettingsSection[] = [
  { id: "canais", label: "Canais", icon: RadioTowerIcon },
  { id: "organizacao", label: "Organização", icon: Building2Icon },
  { id: "white-label", label: "White-label", icon: PaletteIcon },
  { id: "equipe", label: "Equipe", icon: UsersIcon },
  { id: "ia", label: "IA & Automação", icon: BotIcon },
  { id: "webhooks", label: "Webhooks & API", icon: PlugZapIcon },
]

export default function ConfiguracoesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Configurações"
        description="Canais, organização, marca dos formulários, equipe e o cérebro de IA da Bella Decor."
      >
        <Button size="sm">Salvar alterações</Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <aside>
          <SettingsNav sections={SECTIONS} />
        </aside>

        <div className="min-w-0 space-y-6">
          <SectionCard
            id="canais"
            icon={RadioTowerIcon}
            title="Canais"
            description="Contas e páginas conectadas para inbox, leads e publicação."
          >
            <ChannelsSettings />
          </SectionCard>

          <SectionCard
            id="organizacao"
            icon={Building2Icon}
            title="Organização"
            description="Dados da empresa, fuso, idioma e o seu plano."
          >
            <OrgSettings />
          </SectionCard>

          <SectionCard
            id="white-label"
            icon={PaletteIcon}
            title="White-label"
            description="Marca dos formulários e landing pages públicos hospedados."
          >
            <WhiteLabelSettings />
          </SectionCard>

          <SectionCard
            id="equipe"
            icon={UsersIcon}
            title="Equipe"
            description="Quem acessa o Marketero e com qual papel."
            action={<Button size="sm">Convidar</Button>}
          >
            <TeamSettings />
          </SectionCard>

          <SectionCard
            id="ia"
            icon={BotIcon}
            title="IA & Automação"
            accent={<AiTag />}
            description="Modelo do Agente, faixas de confiança e escalonamento para humano."
          >
            <AiAutomationSettings />
          </SectionCard>

          <SectionCard
            id="webhooks"
            icon={PlugZapIcon}
            title="Webhooks & API"
            description="Endpoints de ingestão de eventos e tokens de verificação."
          >
            <WebhooksSettings />
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  )
}
