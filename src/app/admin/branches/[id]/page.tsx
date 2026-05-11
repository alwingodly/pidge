import QRCode from "qrcode"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { MapPin, Phone, Clock, Users } from "lucide-react"
import BranchAdminManager from "@/components/admin/BranchAdminManager"
import CheckinQRCard from "@/components/admin/CheckinQRCard"
import { tenantUrl } from "@/lib/app-url"

export default async function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) return null

  if (session.user.role !== "TENANT_ADMIN") redirect("/admin/branches")

  const { tenantId } = getScopeFromSession(session)

  const [branch, admins, tenant] = await Promise.all([
    prisma.branch.findUnique({
      where: { id, tenantId },
      include: { _count: { select: { doctors: true, appointments: true } } },
    }),
    prisma.adminUser.findMany({
      where: { tenantId, branchId: id, role: "BRANCH_ADMIN", isActive: true },
      select: { id: true, name: true, email: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { slug: true, branchModeEnabled: true },
    }),
  ])

  if (!tenant?.branchModeEnabled) notFound()
  if (!branch) notFound()

  const checkinUrl = tenantUrl(tenant.slug, "/checkin", { branch: branch.slug })
  const qrDataUrl  = await QRCode.toDataURL(checkinUrl, {
    width:  220,
    margin: 2,
    color:  { dark: "#1C1007", light: "#FFFFFF" },
  })

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/branches" className="text-sm text-muted-foreground hover:text-foreground">
          ← Branches
        </Link>
        <h1 className="text-xl font-semibold text-foreground">{branch.name}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${branch.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
          {branch.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Branch info */}
      <div className="bg-white rounded-lg border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Branch Details</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2.5 text-foreground">
            <span className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5 text-primary" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="font-medium">{branch.address || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-foreground">
            <span className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Phone className="w-3.5 h-3.5 text-primary" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{branch.phone || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-foreground">
            <span className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-primary" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Timezone</p>
              <p className="font-medium">{branch.timezone || "Clinic default"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-foreground">
            <span className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 text-primary" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Activity</p>
              <p className="font-medium">{branch._count.doctors} doctors · {branch._count.appointments} bookings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Walk-in QR code */}
      <div className="bg-white rounded-lg border border-border p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Walk-in QR Code</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Print and display at reception. Patients scan to check in for walk-in appointments.
          </p>
        </div>
        <CheckinQRCard url={checkinUrl} qrDataUrl={qrDataUrl} branchName={branch.name} />
      </div>

      {/* Branch admins */}
      <div className="bg-white rounded-lg border border-border p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Branch Admins</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            These users can log in and manage only this branch — doctors, slots, and appointments.
          </p>
        </div>
        <BranchAdminManager
          branchId={branch.id}
          branchName={branch.name}
          initialAdmins={admins}
        />
      </div>
    </div>
  )
}
