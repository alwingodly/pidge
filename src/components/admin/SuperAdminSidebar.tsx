"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Building2, LogOut, ChevronLeft, ChevronRight } from "lucide-react"

const NAV = [
  { href: "/superadmin",         label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/tenants", label: "Tenants",   icon: Building2 },
]

export default function SuperAdminSidebar() {
  const pathname    = usePathname()
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
    <aside
      className="sticky top-0 flex flex-col shrink-0 h-screen transition-all duration-300"
      style={{ width: collapsed ? 56 : 200, background: "#BF4646" }}
    >
      {/* Logo */}
      <div className="flex items-center px-3 py-4 border-b border-white/15" style={{ minHeight: 56 }}>
        {!collapsed && (
          <>
            <div className="w-7 h-7 rounded-md flex items-center justify-center font-black text-white text-xs shrink-0"
              style={{ background: "rgba(255,255,255,0.2)" }}>P</div>
            <div className="ml-2 overflow-hidden">
              <p className="font-bold text-sm leading-none text-white whitespace-nowrap">Pikatym</p>
              <p className="text-xs mt-0.5 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.55)", fontSize: 10 }}>
                Super Admin
              </p>
            </div>
          </>
        )}
        <button
          onClick={toggle}
          className={cn("w-6 h-6 rounded-full flex items-center justify-center shadow-md", collapsed ? "mx-auto" : "ml-auto")}
          style={{ background: "#fff", color: "#BF4646" }}
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
                background: active ? "rgba(255,255,255,0.18)" : "transparent",
                color:      active ? "#fff" : "rgba(255,255,255,0.7)",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.1)" }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent" }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-2 py-3 border-t border-white/15">
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "w-full flex items-center rounded-md text-sm font-medium transition-all",
            collapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2",
          )}
          style={{ color: "rgba(255,255,255,0.55)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)" }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Sign out</span>}
        </button>
      </div>

    </aside>
  )
}
