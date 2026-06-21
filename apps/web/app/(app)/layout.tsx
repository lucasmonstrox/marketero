import * as React from "react"

import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"

import { AppHeader } from "@/shared/app-shell/app-header"
import { AppSidebar } from "@/shared/app-shell/app-sidebar"

/**
 * Shell garante apenas a área de altura limitada (`flex-1 min-h-0`). Cada
 * página decide seu enquadramento: páginas-documento usam `<PageContainer>`
 * (largura contida + rolagem); editores full-bleed (inbox, funil, workflows,
 * builder) ocupam `h-full` e gerenciam a própria rolagem interna.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <AppHeader />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
