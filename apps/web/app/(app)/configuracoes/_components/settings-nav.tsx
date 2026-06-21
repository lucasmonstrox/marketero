"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

export interface SettingsSection {
  id: string
  label: string
  icon: LucideIcon
}

/**
 * Sub-nav vertical fixo das seções de Configurações. Acompanha a seção ativa via
 * IntersectionObserver (com o root no viewport do ScrollArea da página) e rola
 * suavemente até a âncora ao clicar. Teclado e foco preservados (são <a>).
 */
export function SettingsNav({ sections }: { sections: SettingsSection[] }) {
  const [active, setActive] = React.useState(sections[0]?.id ?? "")
  const navRef = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    // O scroll real acontece dentro do viewport do ScrollArea, não na window.
    const root =
      navRef.current?.closest<HTMLElement>(
        "[data-slot=scroll-area-viewport]"
      ) ?? null

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target.id) setActive(visible[0].target.id)
      },
      {
        root,
        // Foca a faixa superior do viewport para escolher a seção "atual".
        rootMargin: "-8% 0px -70% 0px",
        threshold: 0,
      }
    )

    for (const section of sections) {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [sections])

  function handleClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) {
    const el = document.getElementById(id)
    if (!el) return
    event.preventDefault()
    el.scrollIntoView({ behavior: "smooth", block: "start" })
    setActive(id)
    // Mantém o foco navegável sem re-rolar bruscamente.
    el.setAttribute("tabindex", "-1")
    ;(el as HTMLElement).focus({ preventScroll: true })
  }

  return (
    <nav
      ref={navRef}
      aria-label="Seções de configurações"
      className="lg:sticky lg:top-0"
    >
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {sections.map((section) => {
          const Icon = section.icon
          const isActive = active === section.id
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                aria-current={isActive ? "true" : undefined}
                onClick={(e) => handleClick(e, section.id)}
                className={cn(
                  "focus-visible:ring-ring/50 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 lg:w-full",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    isActive ? "text-primary" : ""
                  )}
                  aria-hidden
                />
                {section.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
