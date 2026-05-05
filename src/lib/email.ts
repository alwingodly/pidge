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

export async function sendBookingOTPEmail(email: string, otp: string, patientName: string) {
  return send(
    email,
    `Your verification code — ${otp}`,
    `<div style="font-family:sans-serif;max-width:420px;margin:0 auto">
      <div style="background:#BF4646;border-radius:12px 12px 0 0;padding:24px 28px">
        <div style="width:32px;height:32px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:16px">P</div>
        <h1 style="color:#fff;font-size:18px;font-weight:700;margin:12px 0 0">Email verification</h1>
      </div>
      <div style="background:#fff;border:1px solid #E8E3DC;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px">
        <p style="color:#1C1007;font-size:14px;margin:0 0 16px">Hi ${patientName}, please use the code below to verify your email and complete your booking.</p>
        <div style="background:#FFF4EA;border:1px solid #EDDCC6;border-radius:10px;padding:20px;text-align:center;margin:0 0 20px">
          <p style="color:#9A7A5A;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">Verification code</p>
          <p style="color:#BF4646;font-size:36px;font-weight:900;letter-spacing:10px;margin:0;font-family:monospace">${otp}</p>
        </div>
        <p style="color:#9A7A5A;font-size:12px;margin:0">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    </div>`
  )
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  return send(
    email,
    "Reset your password — Pikatym",
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#BF4646;border-radius:12px 12px 0 0;padding:28px 32px">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:18px">P</div>
        <h1 style="color:#fff;font-size:22px;font-weight:700;margin:16px 0 4px">Reset your password</h1>
        <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:0">Pikatym Admin</p>
      </div>
      <div style="background:#fff;border:1px solid #E8E3DC;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px">
        <p style="color:#1C1007;font-size:14px;margin:0 0 16px">We received a request to reset the password for your Pikatym account.</p>
        <p style="color:#1C1007;font-size:14px;margin:0 0 24px">Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#BF4646;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px">
          Reset password →
        </a>
        <p style="color:#9A7A5A;font-size:12px;margin:24px 0 0">If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
        <p style="color:#9A7A5A;font-size:12px;margin:8px 0 0">Or copy this link into your browser:<br/>
          <a href="${resetUrl}" style="color:#BF4646;word-break:break-all">${resetUrl}</a>
        </p>
      </div>
      <p style="color:#C8C0B8;font-size:11px;text-align:center;margin:16px 0 0">Pikatym · OutRift Technologies</p>
    </div>`
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
