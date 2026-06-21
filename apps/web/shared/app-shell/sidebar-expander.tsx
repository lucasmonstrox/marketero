"use client"

import * as React from "react"

import { useSidebar } from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Toggle minimalista grudado na borda direita da sidebar, centralizado
 * verticalmente. Em repouso é uma barrinha `|`; no hover as duas linhas
 * rotacionam e formam um chevron — aponta pra dentro quando a sidebar está
 * aberta (recolher) e pra fora quando recolhida (expandir).
 */
export function SidebarExpander() {
  const { state, toggleSidebar, isMobile } = useSidebar()
  const [hovered, setHovered] = React.useState(false)

  const expanded = state === "expanded"
  // Aberto → chevron aponta pra esquerda (recolher); recolhido → pra direita.
  const rotation = expanded ? 17 : -17
  const topLineRotation = hovered ? rotation : 0
  const bottomLineRotation = hovered ? -rotation : 0

  if (isMobile) return null

  return (
    <button
      type="button"
      aria-label={expanded ? "Recolher menu" : "Expandir menu"}
      onClick={toggleSidebar}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "fixed top-1/2 z-50 hidden -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-accent-brand/60 transition-[left] duration-200 ease-linear hover:bg-accent-brand/10 hover:text-accent-brand md:flex",
        expanded ? "left-(--sidebar-width)" : "left-(--sidebar-width-icon)"
      )}
    >
      <svg
        width="4"
        height="30"
        viewBox="0 0 4 30"
        fill="none"
        className="pointer-events-none overflow-visible"
      >
        <line
          x1="2"
          y1="1.5"
          x2="2"
          y2="15"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="transition-transform duration-300 ease-in-out"
          style={{
            transformOrigin: "2px 8.25px",
            transform: `rotate(${topLineRotation}deg)`,
          }}
        />
        <line
          x1="2"
          y1="15"
          x2="2"
          y2="28.5"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="transition-transform duration-300 ease-in-out"
          style={{
            transformOrigin: "2px 21.75px",
            transform: `rotate(${bottomLineRotation}deg)`,
          }}
        />
      </svg>
    </button>
  )
}
