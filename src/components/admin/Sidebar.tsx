"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  CalendarDays, Stethoscope, Briefcase, GitBranch,
  LogOut, LayoutDashboard, Clock, ChevronLeft, ChevronRight, Settings, Users, UsersRound,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from "@/components/ui/dialog"

const ALL_NAV = [
  { href: "/admin",              label: "Dashboard",      icon: LayoutDashboard, roles: ["TENANT_ADMIN", "BRANCH_ADMIN"], feature: null },
  { href: "/admin/appointments", label: "Appointments",   icon: CalendarDays,    roles: ["TENANT_ADMIN", "BRANCH_ADMIN"], feature: null },
  { href: "/admin/queue",        label: "Walk-in Queue",  icon: Users,           roles: ["TENANT_ADMIN", "BRANCH_ADMIN"], feature: "walkInEnabled" },
  { href: "/admin/doctors",      label: "Doctors",        icon: Stethoscope,     roles: ["TENANT_ADMIN", "BRANCH_ADMIN"], feature: null },
  { href: "/admin/services",     label: "Services",       icon: Briefcase,       roles: ["TENANT_ADMIN", "BRANCH_ADMIN"], feature: null },
  { href: "/admin/schedule",     label: "Schedule",       icon: Clock,           roles: ["TENANT_ADMIN", "BRANCH_ADMIN"], feature: null },
  { href: "/admin/patients",     label: "Patients",       icon: UsersRound,      roles: ["TENANT_ADMIN", "BRANCH_ADMIN"], feature: null },
  { href: "/admin/branches",     label: "Branches",       icon: GitBranch,       roles: ["TENANT_ADMIN"],                 feature: "branchModeEnabled" },
  { href: "/admin/settings",     label: "Settings",       icon: Settings,        roles: ["TENANT_ADMIN", "BRANCH_ADMIN"], feature: null },
]

type Features = {
  walkInEnabled:     boolean
  branchModeEnabled: boolean
}

export default function Sidebar({ role, features }: { role: string; features: Features }) {
  const pathname   = usePathname()
  const [collapsed,       setCollapsed]       = useState(false)
  const [confirmSignOut,  setConfirmSignOut]  = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "true")
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  const nav = ALL_NAV.filter((item) => {
    if (!item.roles.includes(role)) return false
    if (item.feature && !features[item.feature as keyof Features]) return false
    return true
  })

  function toggle() {
    setCollapsed((p) => {
      localStorage.setItem("sidebar-collapsed", String(!p))
      return !p
    })
  }

  return (
    <>
    <aside
      className="relative flex shrink-0 flex-col transition-all duration-300"
      style={{
        width:      collapsed ? 56 : 216,
        background: "var(--sidebar-bg)",
        height:     "100vh",
        position:   "sticky",
        top:        0,
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center border-b px-3"
        style={{ minHeight: 56, borderColor: "var(--sidebar-border)" }}
      >
        {!collapsed && (
          <>
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "var(--accent)" }}
            >
              <Image src="/pikatym-white.svg" alt="Pikatym" width={18} height={24} className="h-6 w-auto object-contain" />
            </div>
            <div className="ml-2.5 min-w-0 overflow-hidden">
              <p className="truncate text-sm font-bold leading-tight" style={{ color: "var(--sidebar-text-active)" }}>Pikatym</p>
              <p className="truncate text-[11px]" style={{ color: "var(--sidebar-text)" }}>
                {role === "BRANCH_ADMIN" ? "Branch Admin" : "Clinic Admin"}
              </p>
            </div>
          </>
        )}
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex size-6 items-center justify-center rounded-full border shadow-md transition-colors",
            collapsed ? "mx-auto" : "ml-auto",
          )}
          style={{ borderColor: "var(--sidebar-toggle-border)", background: "var(--sidebar-toggle-bg)", color: "var(--sidebar-toggle-fg)" }}
        >
          {collapsed
            ? <ChevronRight className="size-3" />
            : <ChevronLeft  className="size-3" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {!collapsed && (
          <p
            className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--sidebar-section-label)" }}
          >
            Menu
          </p>
        )}

        <div className="space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-150",
                  collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2",
                )}
                style={{
                  background: active ? "var(--sidebar-active-bg)" : "transparent",
                  color:      active ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "var(--sidebar-hover-bg)"
                    e.currentTarget.style.color = "var(--sidebar-text-active)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent"
                    e.currentTarget.style.color = "var(--sidebar-text)"
                  }
                }}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
                {!collapsed && active && (
                  <div
                    className="ml-auto h-4 w-0.5 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Sign out */}
      <div
        className="border-t px-2 py-3"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <button
          onClick={() => setConfirmSignOut(true)}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex w-full items-center rounded-lg text-sm font-medium transition-all duration-150",
            collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2",
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
          <LogOut className="size-4 shrink-0" />
          {!collapsed && <span className="truncate">Sign out</span>}
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
            Confirm whether you want to sign out of the admin area.
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
