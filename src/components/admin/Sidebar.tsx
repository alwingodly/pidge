"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  CalendarDays, Stethoscope, Briefcase, GitBranch,
  LogOut, LayoutDashboard, Clock, ChevronLeft, ChevronRight, Settings,
} from "lucide-react"

const ALL_NAV = [
  { href: "/admin",              label: "Dashboard",    icon: LayoutDashboard, roles: ["TENANT_ADMIN", "BRANCH_ADMIN"] },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarDays,    roles: ["TENANT_ADMIN", "BRANCH_ADMIN"] },
  { href: "/admin/doctors",      label: "Doctors",      icon: Stethoscope,     roles: ["TENANT_ADMIN", "BRANCH_ADMIN"] },
  { href: "/admin/services",     label: "Services",     icon: Briefcase,       roles: ["TENANT_ADMIN", "BRANCH_ADMIN"] },
  { href: "/admin/schedule",     label: "Schedule",     icon: Clock,           roles: ["TENANT_ADMIN", "BRANCH_ADMIN"] },
  { href: "/admin/branches",     label: "Branches",     icon: GitBranch,       roles: ["TENANT_ADMIN"] },
  { href: "/admin/settings",     label: "Settings",     icon: Settings,        roles: ["TENANT_ADMIN"] },
]

export default function Sidebar({ role }: { role: string }) {
  const pathname   = usePathname()
  const [collapsed, setCollapsed] = useState(() => (
    typeof window !== "undefined" && localStorage.getItem("sidebar-collapsed") === "true"
  ))

  const nav = ALL_NAV.filter((item) => item.roles.includes(role))

  function toggle() {
    setCollapsed((p) => {
      localStorage.setItem("sidebar-collapsed", String(!p))
      return !p
    })
  }

  return (
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
              className="flex size-8 shrink-0 items-center justify-center rounded-lg font-black text-sm"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              P
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
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
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
  )
}
