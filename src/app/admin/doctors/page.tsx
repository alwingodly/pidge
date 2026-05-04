import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import Image from "next/image"
import AddDoctorDialog from "@/components/admin/AddDoctorDialog"
import EditDoctorDialog from "@/components/admin/EditDoctorDialog"
import { CalendarDays, Stethoscope, UserRound } from "lucide-react"

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join("")
}

export default async function DoctorsPage() {
  const session = await auth()
  if (!session) return null
  const { tenantId, branchId } = getScopeFromSession(session)

  const [doctors, branches, services] = await Promise.all([
    prisma.doctor.findMany({
      where: { tenantId, branchId: branchId ?? undefined },
      orderBy: { name: "asc" },
      include: {
        doctorServices: true,
        _count: { select: { appointments: true } },
      },
    }),
    prisma.branch.findMany({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } }),
  ])

  const activeCount = doctors.filter((doctor) => doctor.isActive).length

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Doctors</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {doctors.length} total · {activeCount} active
          </p>
        </div>
        <AddDoctorDialog
          branches={branches}
          services={services}
          tenantId={tenantId}
          defaultBranchId={branchId}
          isBranchAdmin={session.user.role === "BRANCH_ADMIN"}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#F3EAE0] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-primary">
              <Stethoscope className="size-3.5" />
            </div>
            <p className="text-sm font-bold text-foreground">Clinicians</p>
          </div>
          <span className="text-xs text-muted-foreground">{doctors.length} rows</span>
        </div>

        {doctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
              <UserRound className="size-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">No doctors yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Use Add Doctor to create the first profile.</p>
            <div className="mt-4">
              <AddDoctorDialog
                branches={branches}
                services={services}
                tenantId={tenantId}
                defaultBranchId={branchId}
                isBranchAdmin={session.user.role === "BRANCH_ADMIN"}
              />
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#F3EAE0]">
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {doctor.photoUrl ? (
                    <Image
                      src={doctor.photoUrl}
                      alt={doctor.name}
                      width={40}
                      height={40}
                      className="size-10 rounded-lg object-cover ring-1 ring-[#E8D8C5]"
                    />
                  ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-primary ring-1 ring-[#E8D8C5]">
                      {getInitials(doctor.name) || <UserRound className="size-4" />}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{doctor.name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                        doctor.isActive
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-muted text-muted-foreground ring-border"
                      }`}>
                        {doctor.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{doctor.speciality}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pl-13 sm:justify-end sm:pl-0">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="size-3" />
                    {doctor._count.appointments} appt{doctor._count.appointments !== 1 ? "s" : ""}
                  </span>
                  <EditDoctorDialog
                    doctor={doctor}
                    branches={branches}
                    services={services}
                    tenantId={tenantId}
                    defaultBranchId={branchId}
                    isBranchAdmin={session.user.role === "BRANCH_ADMIN"}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
