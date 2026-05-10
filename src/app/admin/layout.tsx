import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import Sidebar from "@/components/admin/Sidebar"

const ALLOWED_ROLES = ["TENANT_ADMIN", "BRANCH_ADMIN", "SUPER_ADMIN"]

function appBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://pikatym.com"
}

function tenantUrl(slug: string) {
  return `${appBaseUrl()}?__tenant=${encodeURIComponent(slug)}`
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session || !ALLOWED_ROLES.includes(session.user.role)) redirect("/admin/login")
  if (session.user.role === "SUPER_ADMIN") redirect("/superadmin/tenants")

  const previewUrl = tenantUrl(session.user.tenantSlug)
  const previewLabel = previewUrl.replace(/^https?:\/\//, "")
  const tenantFeatures = await prismaTenantFeatures(session.user.tenantId)

  return (
    <div className="flex min-h-screen" style={{ background: "#F5F2EE" }}>
      <Sidebar role={session.user.role} features={tenantFeatures} />

      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[#E8E3DC] bg-white/90 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {session.user.name}
            </span>
            <span className="text-[#E8D8C5]">·</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              {session.user.role === "BRANCH_ADMIN" ? "Branch" : "Admin"}
            </span>
          </div>

          <Link
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[#E8D8C5] bg-secondary/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            <ExternalLink className="size-3" />
            {previewLabel}
          </Link>
        </header>

        <main className="flex-1 px-6 py-6">
          <div className="mx-auto max-w-5xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

async function prismaTenantFeatures(tenantId: string) {
  const { prisma } = await import("@/lib/db")
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      walkInEnabled: true,
      branchModeEnabled: true,
    },
  })
  return {
    walkInEnabled: tenant?.walkInEnabled ?? true,
    branchModeEnabled: tenant?.branchModeEnabled ?? false,
  }
}
