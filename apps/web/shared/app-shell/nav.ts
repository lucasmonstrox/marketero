import {
  BarChart3Icon,
  InboxIcon,
  KanbanIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  type LucideIcon,
  MegaphoneIcon,
  SettingsIcon,
  WorkflowIcon,
} from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
}

export interface NavSection {
  label?: string
  items: NavItem[]
}

/**
 * Navegação do shell (estudo §7.1). Plana, sem perfis — auth fica para uma
 * leva futura. As páginas são placeholders (TODO) por agora.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ title: "Visão geral", href: "/", icon: LayoutDashboardIcon }],
  },
  {
    label: "Operação",
    items: [
      { title: "Inbox", href: "/inbox", icon: InboxIcon },
      { title: "Funil", href: "/funil", icon: KanbanIcon },
      { title: "Campanhas", href: "/campanhas", icon: MegaphoneIcon },
    ],
  },
  {
    label: "Construção",
    items: [
      { title: "Workflows", href: "/workflows", icon: WorkflowIcon },
      { title: "Builder", href: "/builder", icon: LayoutTemplateIcon },
    ],
  },
  {
    label: "Análise",
    items: [{ title: "Métricas", href: "/metricas", icon: BarChart3Icon }],
  },
  {
    label: "Sistema",
    items: [{ title: "Configurações", href: "/configuracoes", icon: SettingsIcon }],
  },
]

/** Título da página atual, para breadcrumb/header. */
export function titleForPath(pathname: string): string {
  const items = NAV_SECTIONS.flatMap((section) => section.items)
  const exact = items.find((item) => item.href === pathname)
  if (exact) return exact.title
  const prefix = items.find((item) => item.href !== "/" && pathname.startsWith(item.href))
  return prefix?.title ?? "Marketero"
}
