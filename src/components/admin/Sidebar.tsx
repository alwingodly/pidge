"use client"

import { useState, useEffect } from "react"
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

const SIDEBAR_BG   = "#110808"
const ACTIVE_BG    = "rgba(191,70,70,0.22)"
const HOVER_BG     = "rgba(255,255,255,0.06)"
const TEXT_ACTIVE  = "#ffffff"
const TEXT_DEFAULT = "rgba(255,255,255,0.55)"

export default function Sidebar({ role }: { role: string }) {
  const pathname   = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const nav = ALL_NAV.filter((item) => item.roles.includes(role))

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    if (stored === "true") setCollapsed(true)
  }, [])

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
        background: SIDEBAR_BG,
        height:     "100vh",
        position:   "sticky",
        top:        0,
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center border-b px-3"
        style={{ minHeight: 56, borderColor: "rgba(255,255,255,0.07)" }}
      >
        {!collapsed && (
          <>
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg font-black text-sm text-white"
              style={{ background: "#BF4646" }}
            >
              P
            </div>
            <div className="ml-2.5 min-w-0 overflow-hidden">
              <p className="truncate text-sm font-bold leading-tight text-white">Pidge</p>
              <p className="truncate text-[11px]" style={{ color: TEXT_DEFAULT }}>
                {role === "BRANCH_ADMIN" ? "Branch Admin" : "Clinic Admin"}
              </p>
            </div>
          </>
        )}
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex size-6 items-center justify-center rounded-full border border-[#E8D8C5] bg-white shadow-md transition-colors hover:bg-secondary",
            collapsed ? "mx-auto" : "ml-auto",
          )}
          style={{ color: "#BF4646" }}
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
            style={{ color: "rgba(255,255,255,0.3)" }}
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
                  background: active ? ACTIVE_BG : "transparent",
                  color:      active ? TEXT_ACTIVE : TEXT_DEFAULT,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = HOVER_BG
                    e.currentTarget.style.color = "rgba(255,255,255,0.85)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent"
                    e.currentTarget.style.color = TEXT_DEFAULT
                  }
                }}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
                {!collapsed && active && (
                  <div
                    className="ml-auto h-4 w-0.5 rounded-full"
                    style={{ background: "#BF4646" }}
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
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex w-full items-center rounded-lg text-sm font-medium transition-all duration-150",
            collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2",
          )}
          style={{ color: TEXT_DEFAULT }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(191,70,70,0.15)"
            e.currentTarget.style.color = "#ef9a9a"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.color = TEXT_DEFAULT
          }}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && <span className="truncate">Sign out</span>}
        </button>
      </div>

    </aside>
  )
}
