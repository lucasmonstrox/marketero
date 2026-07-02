"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"

import { Logo } from "@/shared/ui/logo"
import { ThemeToggle } from "@/shared/ui/theme-toggle"
import { NAV_SECTIONS } from "./nav"
import { SidebarExpander } from "./sidebar-expander"
import { SidebarSearch } from "./sidebar-search"
import { UserMenu } from "./user-menu"

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link
            href="/"
            className="flex items-center px-1 py-1.5"
            aria-label="Marketero — início"
          >
            <Logo />
          </Link>
          <SidebarSearch />
        </SidebarHeader>

        <SidebarContent>
          {NAV_SECTIONS.map((section, i) => (
            <SidebarGroup key={section.label ?? i}>
              {section.label ? (
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              ) : null}
              <SidebarMenu>
                {section.items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href)
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className="data-active:bg-sidebar-primary! data-active:text-sidebar-primary-foreground! data-active:hover:bg-sidebar-primary!"
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center justify-end px-1">
            <ThemeToggle />
          </div>
          <UserMenu />
        </SidebarFooter>
      </Sidebar>
      <SidebarExpander />
    </>
  )
}
