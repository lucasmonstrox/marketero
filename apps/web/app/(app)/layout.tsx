import * as React from "react"

import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"

import { AppHeader } from "@/shared/app-shell/app-header"
import { AppSidebar } from "@/shared/app-shell/app-sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <AppHeader />
        <ScrollArea className="min-h-0 w-full flex-1">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 md:px-6">
            {children}
          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  )
}
