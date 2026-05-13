"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Clock, CreditCard, FileText, KeyRound, Settings2, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/admin/settings/general",       label: "General",       icon: Settings2,  roles: ["TENANT_ADMIN"] },
  { href: "/admin/settings/landing",       label: "Landing",       icon: FileText,   roles: ["TENANT_ADMIN"] },
  { href: "/admin/settings/booking",       label: "Booking",       icon: Clock,      roles: ["TENANT_ADMIN"] },
  { href: "/admin/settings/payments",      label: "Payments",      icon: CreditCard, roles: ["TENANT_ADMIN"] },
  { href: "/admin/settings/notifications", label: "Notifications", icon: Bell,       roles: ["TENANT_ADMIN"] },
  { href: "/admin/settings/team",          label: "Team",          icon: Users,      roles: ["TENANT_ADMIN"] },
  { href: "/admin/settings/security",      label: "Security",      icon: KeyRound,   roles: ["TENANT_ADMIN", "BRANCH_ADMIN"] },
]

export default function SettingsNav({ role }: { role: string }) {
  const pathname = usePathname()
  const nav = NAV.filter(item => item.roles.includes(role))

  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-primary"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
            {active && (
              <div className="ml-auto h-4 w-0.5 rounded-full bg-primary" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
