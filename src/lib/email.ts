import { Resend } from "resend"

function resend() {
  return new Resend(process.env.RESEND_API_KEY ?? "")
}

async function send(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", to)
    return
  }
  return resend().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject,
    html,
  })
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const appUrl = process.env.NEXT_PUBLIC_APP_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://pikatym.io")

function cancelLink(token: string) {
  return `${appUrl}/cancel?token=${token}`
}

function bookingUrl(slug: string) {
  return `${appUrl}?__tenant=${encodeURIComponent(slug)}`
}

function row(label: string, value: string) {
  return `<tr><td style="padding:4px 12px 4px 0;color:#9A7A5A;font-size:13px">${label}</td><td style="padding:4px 0;font-size:13px;font-weight:600">${value}</td></tr>`
}

function table(...rows: string[]) {
  return `<table style="border-collapse:collapse;margin:16px 0">${rows.join("")}</table>`
}

// ── Types ─────────────────────────────────────────────────────────────────────

type FullAppointment = {
  bookingRef:      string
  patientName:     string
  patientSurname?: string | null
  patientEmail:    string
  patientPhone:    string
  patientAddress?: string | null
  patientPostcode?: string | null
  patientCity?:    string | null
  patientDOB?:     Date | null
  patientGender?:  string | null
  notes?:          string | null
  attachmentName?: string | null
  cancelToken:     string
  status:          string
  preferredDate?:  Date | null
  assignedDate?:   Date | null
  assignedTime?:   string | null
  slot?:    { date: Date; startTime: string } | null
  service:  { name: string }
  doctor?:  { name: string } | null
  tenant:   { name: string; slug: string }
  branch?:  { address?: string | null; name: string } | null
}

// ── Patient receives on booking creation ──────────────────────────────────────
export async function sendBookingAcknowledgement(appt: FullAppointment) {
  const { patientName, patientEmail, bookingRef, service, tenant, preferredDate, cancelToken } = appt
  const dateStr = preferredDate
    ? new Date(preferredDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "to be confirmed"

  return send(
    patientEmail,
    `Booking request received — ${bookingRef}`,
    `<p style="font-family:sans-serif;color:#1C1007">Hi ${patientName},</p>
     <p style="font-family:sans-serif;color:#1C1007">We've received your appointment request. Our team will review it and confirm your clinician and time shortly.</p>
     ${table(
       row("Reference", bookingRef),
       row("Service", service.name),
       row("Preferred date", dateStr),
     )}
     <p style="font-family:sans-serif;color:#9A7A5A;font-size:13px">
       We'll send another email once your appointment is confirmed.<br/>
       <a href="${cancelLink(cancelToken)}" style="color:#BF4646">Cancel this request</a>
     </p>
     <p style="font-family:sans-serif;color:#1C1007">— ${tenant.name}</p>`
  )
}

// ── Admin receives on booking creation ───────────────────────────────────────
export async function sendAdminNewRequest(appt: FullAppointment) {
  const {
    patientName, patientSurname, patientEmail, patientPhone,
    patientAddress, patientPostcode, patientCity, patientDOB, patientGender,
    notes, attachmentName, bookingRef, service, tenant, preferredDate,
  } = appt
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? process.env.EMAIL_FROM!

  const fullName = [patientName, patientSurname].filter(Boolean).join(" ")
  const address  = [patientAddress, patientCity, patientPostcode].filter(Boolean).join(", ")
  const dateStr  = preferredDate
    ? new Date(preferredDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "Not specified"
  const dobStr = patientDOB
    ? new Date(patientDOB).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null

  return send(
    adminEmail,
    `New booking request — ${fullName} — ${service.name}`,
    `<p style="font-family:sans-serif;color:#1C1007">A new booking request has been submitted.</p>
     ${table(
       row("Patient",        fullName),
       row("Phone",          patientPhone),
       row("Email",          patientEmail),
       ...(dobStr              ? [row("Date of birth",    dobStr)]                          : []),
       ...(patientGender       ? [row("Gender identity",  patientGender.replace(/-/g, " "))] : []),
       ...(address             ? [row("Address",          address)]                          : []),
       row("Service",        service.name),
       row("Preferred date", dateStr),
       row("Notes",          notes ?? "None"),
       ...(attachmentName    ? [row("Attachment",       attachmentName)]                   : []),
       row("Reference",      bookingRef),
     )}
     <p style="font-family:sans-serif">
       <a href="${bookingUrl(tenant.slug)}/admin/appointments" style="color:#BF4646;font-weight:bold">
         Open in dashboard →
       </a>
     </p>`
  )
}

// ── Patient receives when admin assigns doctor + time ─────────────────────────
export async function sendAssignmentConfirmation(appt: FullAppointment) {
  const { patientName, patientEmail, bookingRef, cancelToken, service, doctor, tenant, branch, assignedDate, assignedTime, slot } = appt

  const date = assignedDate ?? slot?.date
  const time = assignedTime ?? slot?.startTime

  const dateStr = date
    ? new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "To be confirmed"

  return send(
    patientEmail,
    `Appointment confirmed — ${bookingRef}`,
    `<p style="font-family:sans-serif;color:#1C1007">Hi ${patientName},</p>
     <p style="font-family:sans-serif;color:#1C1007">Your appointment has been confirmed. See the details below.</p>
     ${table(
       row("Service", service.name),
       row("Clinician", doctor?.name ?? "To be advised"),
       row("Date", dateStr),
       row("Time", time ?? "To be confirmed"),
       ...(branch?.address ? [row("Address", branch.address)] : []),
       row("Reference", bookingRef),
     )}
     <p style="font-family:sans-serif;color:#9A7A5A;font-size:13px">
       <a href="${cancelLink(cancelToken)}" style="color:#BF4646">Cancel appointment</a>
     </p>
     <p style="font-family:sans-serif;color:#1C1007">— ${tenant.name}</p>`
  )
}

// ── Keep existing functions for backward compat ───────────────────────────────

export async function sendPatientConfirmation(appt: FullAppointment) {
  return sendBookingAcknowledgement(appt)
}

export async function sendAdminNotification(appt: FullAppointment) {
  return sendAdminNewRequest(appt)
}

export async function sendApprovalEmail(appt: FullAppointment) {
  return sendAssignmentConfirmation(appt)
}

export async function sendCancellationEmail(appt: FullAppointment) {
  const { patientEmail, patientName, bookingRef, tenant } = appt
  return send(
    patientEmail,
    `Appointment cancelled — ${bookingRef}`,
    `<p style="font-family:sans-serif;color:#1C1007">Hi ${patientName},</p>
     <p style="font-family:sans-serif;color:#1C1007">Your appointment (${bookingRef}) has been cancelled.</p>
     <p style="font-family:sans-serif;color:#9A7A5A">
       To rebook visit: <a href="${bookingUrl(tenant.slug)}" style="color:#BF4646">${bookingUrl(tenant.slug)}</a>
     </p>
     <p style="font-family:sans-serif;color:#1C1007">— ${tenant.name}</p>`
  )
}

export async function sendReminderEmail(appt: FullAppointment) {
  const { patientEmail, patientName, cancelToken, service, doctor, tenant, branch, assignedDate, assignedTime, slot } = appt
  const time = assignedTime ?? slot?.startTime ?? ""
  const date = assignedDate ?? slot?.date

  return send(
    patientEmail,
    `Reminder — appointment tomorrow at ${time}`,
    `<p style="font-family:sans-serif;color:#1C1007">Hi ${patientName},</p>
     <p style="font-family:sans-serif;color:#1C1007">Reminder for your appointment tomorrow.</p>
     ${table(
       row("Clinician", doctor?.name ?? ""),
       row("Service", service.name),
       row("Time", time),
       ...(date ? [row("Date", new Date(date).toDateString())] : []),
       ...(branch?.address ? [row("Address", branch.address)] : []),
     )}
     <p style="font-family:sans-serif;color:#9A7A5A;font-size:13px">
       <a href="${cancelLink(cancelToken)}" style="color:#BF4646">Cancel appointment</a>
     </p>
     <p style="font-family:sans-serif;color:#1C1007">— ${tenant.name}</p>`
  )
}

export async function sendWelcomeEmail(name: string, email: string, password: string, loginUrl: string, clinicName: string) {
  return send(
    email,
    `Welcome to Pikatym — your clinic is live`,
    `<p style="font-family:sans-serif;color:#1C1007">Hi ${name},</p>
     <p style="font-family:sans-serif;color:#1C1007">Your clinic <strong>${clinicName}</strong> is now live on Pikatym.</p>
     ${table(
       row("Login URL", `<a href="${loginUrl}" style="color:#BF4646">${loginUrl}</a>`),
       row("Email", email),
       row("Temp password", password),
     )}
     <p style="font-family:sans-serif;color:#9A7A5A;font-size:13px">Please change your password after logging in.</p>
     <p style="font-family:sans-serif;color:#1C1007">— OutRift Technologies / Pikatym</p>`
  )
}
