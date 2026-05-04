import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { notFound } from "next/navigation"
import { formatDate, formatTime } from "@/lib/utils"
import AppointmentBadge from "@/components/admin/AppointmentBadge"
import AppointmentActions from "@/components/admin/AppointmentActions"
import Link from "next/link"

function age(dob: Date) {
  const today = new Date()
  let a = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--
  return a
}

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) return null
  const { tenantId } = getScopeFromSession(session)

  const appointment = await prisma.appointment.findUnique({
    where:   { id, tenantId },
    include: { slot: true, service: true, doctor: true, branch: true },
  })

  if (!appointment) notFound()

  const fullName = [appointment.patientName, appointment.patientSurname].filter(Boolean).join(" ")

  const dateStr = appointment.assignedDate
    ? formatDate(appointment.assignedDate)
    : appointment.slot ? formatDate(appointment.slot.date)
    : appointment.preferredDate ? `${formatDate(appointment.preferredDate)} (preferred)`
    : null

  const timeStr = appointment.assignedTime
    ?? (appointment.slot ? formatTime(appointment.slot.startTime) : null)

  const address = [appointment.patientAddress, appointment.patientCity, appointment.patientPostcode]
    .filter(Boolean).join(", ")

  return (
    <div className="max-w-lg space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/appointments" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <h1 className="text-lg font-bold text-foreground">{appointment.bookingRef}</h1>
        <AppointmentBadge status={appointment.status} />
      </div>

      {/* Appointment */}
      <Card title="Appointment">
        <Row label="Service"        value={appointment.service.name} />
        <Row label="Clinician"      value={appointment.doctor?.name ?? "Not yet assigned"} dim={!appointment.doctor} />
        {dateStr && <Row label="Date"    value={dateStr} />}
        {timeStr && <Row label="Time"    value={timeStr} />}
        {!dateStr && appointment.preferredDate && (
          <Row label="Preferred date" value={formatDate(appointment.preferredDate)} dim />
        )}
        {appointment.branch && <Row label="Branch" value={appointment.branch.name} />}
      </Card>

      {/* Patient */}
      <Card title="Patient">
        <Row label="Full name"  value={fullName} />
        <Row label="Email"      value={appointment.patientEmail} />
        <Row label="Phone"      value={appointment.patientPhone} />
        {appointment.patientDOB && (
          <Row
            label="Date of birth"
            value={`${formatDate(appointment.patientDOB)} (${age(appointment.patientDOB)} yrs)`}
          />
        )}
        {appointment.patientGender && (
          <Row label="Gender identity" value={appointment.patientGender.replace(/-/g, " ")} />
        )}
        {address && <Row label="Address" value={address} />}
      </Card>

      {/* Notes */}
      {(appointment.notes || appointment.attachmentName) && (
        <Card title="Notes & Attachments">
          {appointment.notes && <Row label="Reason for visit" value={appointment.notes} multiline />}
          {appointment.attachmentName && (
            <Row label="Attachment" value={appointment.attachmentName} />
          )}
        </Card>
      )}

      <AppointmentActions appointmentId={appointment.id} currentStatus={appointment.status} />
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
      <div className="border-b border-[#F3EAE0] bg-secondary/30 px-4 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      </div>
      <div className="divide-y divide-[#F3EAE0]">{children}</div>
    </div>
  )
}

function Row({ label, value, dim, multiline }: {
  label:     string
  value:     string
  dim?:      boolean
  multiline?: boolean
}) {
  return (
    <div className={`flex gap-4 px-4 py-3 ${multiline ? "flex-col" : "items-center justify-between"}`}>
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium capitalize ${dim ? "text-muted-foreground" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  )
}
