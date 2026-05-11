"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Clock, CreditCard, FileText, Settings2, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/admin/settings/general",       label: "General",       icon: Settings2,  },
  { href: "/admin/settings/landing",       label: "Landing",       icon: FileText,   },
  { href: "/admin/settings/booking",       label: "Booking",       icon: Clock,      },
  { href: "/admin/settings/payments",      label: "Payments",      icon: CreditCard, },
  { href: "/admin/settings/notifications", label: "Notifications", icon: Bell,       },
  { href: "/admin/settings/team",          label: "Team",          icon: Users,      },
]

export default function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
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
