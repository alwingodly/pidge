"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Building2, LogOut, ChevronLeft, ChevronRight, MonitorCog } from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from "@/components/ui/dialog"

const NAV = [
  { href: "/superadmin",         label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/tenants", label: "Tenants",   icon: Building2 },
  { href: "/superadmin/login-screen", label: "Login screen", icon: MonitorCog },
]

export default function SuperAdminSidebar() {
  const pathname    = usePathname()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [collapsed, setCollapsed] = useState(() => (
    typeof window !== "undefined" && localStorage.getItem("superadmin-sidebar-collapsed") === "true"
  ))

  function toggle() {
    setCollapsed((p) => {
      localStorage.setItem("superadmin-sidebar-collapsed", String(!p))
      return !p
    })
  }

  return (
    <>
    <aside
      className="sticky top-0 flex flex-col shrink-0 h-screen transition-all duration-300"
      style={{ width: collapsed ? 56 : 196, background: "var(--brand-forest)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-3 py-4 border-b"
        style={{ minHeight: 56, borderColor: "var(--sidebar-border)" }}
      >
        {!collapsed && (
          <>
            <div
              className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white"
            >
              <span className="size-3.5 rounded-full border-[4px] border-primary" />
              <span className="absolute bottom-1.5 left-2 h-0.5 w-3 rounded-full bg-[var(--brand-coral)]" />
            </div>
            <div className="ml-2 overflow-hidden">
              <p className="font-bold text-sm leading-none whitespace-nowrap" style={{ color: "var(--sidebar-text-active)" }}>Outrift</p>
              <p className="text-xs mt-0.5 whitespace-nowrap" style={{ color: "var(--sidebar-text)", fontSize: 10 }}>
                Platform
              </p>
            </div>
          </>
        )}
        <button
          onClick={toggle}
          className={cn("w-6 h-6 rounded-full flex items-center justify-center shadow-md", collapsed ? "mx-auto" : "ml-auto")}
          style={{ background: "var(--sidebar-toggle-bg)", color: "var(--sidebar-toggle-fg)" }}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/superadmin" ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-md text-sm font-medium transition-all",
                collapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2",
              )}
              style={{
                background: active ? "rgba(73, 150, 215, 0.22)" : "transparent",
                color:      active ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--sidebar-hover-bg)" }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent" }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-2 py-3 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
        <button
          onClick={() => setConfirmSignOut(true)}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "w-full flex items-center rounded-md text-sm font-medium transition-all",
            collapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2",
          )}
          style={{ color: "var(--sidebar-text)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--sidebar-active-bg)"
            e.currentTarget.style.color = "var(--sidebar-text-active)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.color = "var(--sidebar-text)"
          }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Sign out</span>}
        </button>
      </div>

    </aside>

    <Dialog open={confirmSignOut} onOpenChange={setConfirmSignOut}>
      <DialogContent className="max-w-70 gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl">
        {/* Icon + text */}
        <div className="flex flex-col items-center gap-1.5 px-6 pb-4 pt-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <LogOut className="size-6 text-foreground" />
          </div>
          <DialogTitle className="mt-3 text-base font-semibold text-foreground">
            Sign out?
          </DialogTitle>
          <DialogDescription className="sr-only">
            Confirm whether you want to sign out of the super admin area.
          </DialogDescription>
          <p className="text-sm text-muted-foreground">
            You&apos;ll be returned to the login page.
          </p>
        </div>

        {/* iOS-style stacked buttons */}
        <div className="border-t border-border">
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex w-full items-center justify-center border-b border-border py-3.5 text-sm font-semibold text-destructive transition-colors hover:bg-muted"
          >
            Sign out
          </button>
          <button
            onClick={() => setConfirmSignOut(false)}
            className="flex w-full items-center justify-center py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
