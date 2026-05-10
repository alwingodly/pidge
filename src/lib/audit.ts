import { prisma } from "@/lib/db"

type Actor = {
  id?: string | null
  name?: string | null
  role?: string | null
}

type Metadata = Record<string, string | number | boolean | null | undefined>

export async function recordAppointmentStatusChange({
  tenantId,
  appointmentId,
  fromStatus,
  toStatus,
  actor,
  note,
  metadata,
}: {
  tenantId: string
  appointmentId: string
  fromStatus?: string | null
  toStatus: string
  actor?: Actor | null
  note?: string | null
  metadata?: Metadata
}) {
  await prisma.$transaction([
    prisma.appointmentStatusHistory.create({
      data: {
        tenantId,
        appointmentId,
        fromStatus: fromStatus ?? null,
        toStatus,
        actorId: actor?.id ?? null,
        actorName: actor?.name ?? null,
        actorRole: actor?.role ?? null,
        note: note ?? null,
      },
    }),
    prisma.auditLog.create({
      data: {
        tenantId,
        appointmentId,
        actorId: actor?.id ?? null,
        actorName: actor?.name ?? null,
        actorRole: actor?.role ?? null,
        action: fromStatus ? "APPOINTMENT_STATUS_CHANGED" : "APPOINTMENT_CREATED",
        entityType: "Appointment",
        entityId: appointmentId,
        metadata: {
          fromStatus: fromStatus ?? null,
          toStatus,
          note: note ?? null,
          ...(metadata ?? {}),
        },
      },
    }),
  ])
}

export async function recordAuditLog({
  tenantId,
  appointmentId,
  actor,
  action,
  entityType,
  entityId,
  metadata,
}: {
  tenantId: string
  appointmentId?: string | null
  actor?: Actor | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Metadata
}) {
  await prisma.auditLog.create({
    data: {
      tenantId,
      appointmentId: appointmentId ?? null,
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? null,
      actorRole: actor?.role ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      metadata: metadata ?? undefined,
    },
  })
}
