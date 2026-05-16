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

// ── HTML escaping ─────────────────────────────────────────────────────────────
function h(str: string | null | undefined): string {
  if (!str) return ""
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
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

const pikatymLogoUrl = `${appUrl}/pikatym-white.svg`

function pikatymEmailMark(size = 32) {
  return `<div style="width:${size}px;height:${size}px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-flex;align-items:center;justify-content:center">
    <img src="${pikatymLogoUrl}" alt="Pikatym" width="${Math.round(size * 0.48)}" style="display:block;height:${Math.round(size * 0.72)}px;width:auto"/>
  </div>`
}

function row(label: string, value: string) {
  return `<tr><td style="padding:4px 12px 4px 0;color:#9A7A5A;font-size:13px">${h(label)}</td><td style="padding:4px 0;font-size:13px;font-weight:600">${h(value)}</td></tr>`
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
  patientDOB?:     Date | string | null
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
  tenant:   { name: string; slug: string; notificationEmail?: string | null; adminEmail?: string | null }
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
    `<p style="font-family:sans-serif;color:#1C1007">Hi ${h(patientName)},</p>
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
     <p style="font-family:sans-serif;color:#1C1007">— ${h(tenant.name)}</p>`
  )
}

// ── Admin receives on booking creation ───────────────────────────────────────
export async function sendAdminNewRequest(appt: FullAppointment) {
  const {
    patientName, patientSurname, patientEmail, patientPhone,
    patientDOB, patientGender,
    notes, attachmentName, bookingRef, service, tenant, preferredDate,
  } = appt
  const adminEmail = appt.tenant.notificationEmail ?? appt.tenant.adminEmail
  if (!adminEmail) return  // no recipient configured, skip silently

  const fullName = [patientName, patientSurname].filter(Boolean).join(" ")
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
    `<p style="font-family:sans-serif;color:#1C1007">Hi ${h(patientName)},</p>
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
     <p style="font-family:sans-serif;color:#1C1007">— ${h(tenant.name)}</p>`
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
    `<p style="font-family:sans-serif;color:#1C1007">Hi ${h(patientName)},</p>
     <p style="font-family:sans-serif;color:#1C1007">Your appointment (${h(bookingRef)}) has been cancelled.</p>
     <p style="font-family:sans-serif;color:#9A7A5A">
       To rebook visit: <a href="${bookingUrl(tenant.slug)}" style="color:#BF4646">${bookingUrl(tenant.slug)}</a>
     </p>
     <p style="font-family:sans-serif;color:#1C1007">— ${h(tenant.name)}</p>`
  )
}

export async function sendCancellationAlert(appt: FullAppointment) {
  const adminEmail = appt.tenant.notificationEmail ?? appt.tenant.adminEmail
  if (!adminEmail) return
  const { patientName, patientSurname, patientEmail, bookingRef, service, doctor, assignedDate, assignedTime, slot } = appt
  const fullName = [patientName, patientSurname].filter(Boolean).join(" ")
  const dateStr  = assignedDate
    ? new Date(assignedDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : slot?.date
      ? new Date(slot.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
      : "Unconfirmed"
  const timeStr = assignedTime ?? slot?.startTime ?? "—"
  return send(
    adminEmail,
    `Appointment cancelled — ${fullName} — ${bookingRef}`,
    `<p style="font-family:sans-serif;color:#1C1007">A patient has cancelled their appointment.</p>
     ${table(
       row("Patient",  fullName),
       row("Email",    patientEmail),
       row("Service",  service.name),
       row("Ref",      bookingRef),
       row("Date",     dateStr),
       row("Time",     timeStr),
       ...(doctor ? [row("Clinician", doctor.name)] : []),
     )}
     <p style="font-family:sans-serif;color:#9A7A5A;font-size:13px">This slot is now free.</p>`
  )
}

export async function sendReminderEmail(appt: FullAppointment) {
  const { patientEmail, patientName, cancelToken, service, doctor, tenant, branch, assignedDate, assignedTime, slot } = appt
  const time = assignedTime ?? slot?.startTime ?? ""
  const date = assignedDate ?? slot?.date

  return send(
    patientEmail,
    `Reminder — appointment tomorrow at ${time}`,
    `<p style="font-family:sans-serif;color:#1C1007">Hi ${h(patientName)},</p>
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
     <p style="font-family:sans-serif;color:#1C1007">— ${h(tenant.name)}</p>`
  )
}

export async function sendBookingOTPEmail(email: string, otp: string, patientName: string) {
  return send(
    email,
    `Your verification code — ${otp}`,
    `<div style="font-family:sans-serif;max-width:420px;margin:0 auto">
      <div style="background:#BF4646;border-radius:12px 12px 0 0;padding:24px 28px">
        ${pikatymEmailMark(32)}
        <h1 style="color:#fff;font-size:18px;font-weight:700;margin:12px 0 0">Email verification</h1>
      </div>
      <div style="background:#fff;border:1px solid #E8E3DC;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px">
        <p style="color:#1C1007;font-size:14px;margin:0 0 16px">Hi ${h(patientName)}, please use the code below to verify your email and complete your booking.</p>
        <div style="background:#FFF4EA;border:1px solid #EDDCC6;border-radius:10px;padding:20px;text-align:center;margin:0 0 20px">
          <p style="color:#9A7A5A;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">Verification code</p>
          <p style="color:#BF4646;font-size:32px;font-weight:900;letter-spacing:6px;margin:0;font-family:monospace">${otp}</p>
        </div>
        <p style="color:#9A7A5A;font-size:12px;margin:0">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    </div>`
  )
}

// ── Patient receives when admin reschedules a confirmed appointment ───────────
export async function sendRescheduleEmail(appt: FullAppointment, previousDate: string, previousTime: string) {
  const { patientName, patientEmail, bookingRef, cancelToken, service, doctor, tenant, branch, assignedDate, assignedTime, slot } = appt

  const date = assignedDate ?? slot?.date
  const time = assignedTime ?? slot?.startTime

  const newDateStr = date
    ? new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "To be confirmed"

  return send(
    patientEmail,
    `Appointment rescheduled — ${bookingRef}`,
    `<p style="font-family:sans-serif;color:#1C1007">Hi ${h(patientName)},</p>
     <p style="font-family:sans-serif;color:#1C1007">Your appointment has been rescheduled. Please see your updated details below.</p>
     ${table(
       row("Service",      service.name),
       row("Clinician",    doctor?.name ?? "To be advised"),
       row("New date",     newDateStr),
       row("New time",     time ?? "To be confirmed"),
       row("Previous",     `${previousDate} at ${previousTime}`),
       ...(branch?.address ? [row("Address", branch.address)] : []),
       row("Reference",    bookingRef),
     )}
     <p style="font-family:sans-serif;color:#9A7A5A;font-size:13px">
       We apologise for any inconvenience caused.<br/>
       <a href="${cancelLink(cancelToken)}" style="color:#BF4646">Cancel appointment</a>
     </p>
     <p style="font-family:sans-serif;color:#1C1007">— ${h(tenant.name)}</p>`
  )
}

// ── Walk-in check-in emails ───────────────────────────────────────────────────

type WalkInAppt = {
  bookingRef:      string
  patientName:     string
  patientSurname?: string | null
  patientEmail:    string
  patientPhone:    string
  checkedInAt:     Date
  service:  { name: string }
  tenant:   { name: string; slug: string; notificationEmail?: string | null; adminEmail?: string | null }
  branch?:  { name: string; address?: string | null } | null
}

export async function sendWalkInCheckIn(appt: WalkInAppt) {
  const { patientName, patientEmail, bookingRef, service, tenant, branch, checkedInAt } = appt
  const timeStr = new Date(checkedInAt).toLocaleTimeString("en-GB", {
    hour:   "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  })

  return send(
    patientEmail,
    `You're checked in — ${bookingRef}`,
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#436850;border-radius:12px 12px 0 0;padding:24px 28px">
        <p style="color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px">Walk-in check-in</p>
        <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0">You're in the queue</h1>
      </div>
      <div style="background:#fff;border:1px solid #E8E3DC;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px">
        <p style="color:#1C1007;font-size:14px;margin:0 0 16px">Hi ${patientName}, you've been checked in at <strong>${tenant.name}</strong>. Please take a seat — a member of the team will call your name shortly.</p>
        ${table(
          row("Reference",   bookingRef),
          row("Service",     service.name),
          row("Checked in",  timeStr),
          ...(branch ? [row("Location", branch.name)] : []),
        )}
        <p style="color:#9A7A5A;font-size:12px;margin:16px 0 0">Please keep this reference number handy in case you are asked for it.</p>
      </div>
      <p style="color:#C8C0B8;font-size:11px;text-align:center;margin:16px 0 0">${tenant.name} · Powered by Pikatym</p>
    </div>`
  )
}

export async function sendAdminWalkInAlert(appt: WalkInAppt) {
  const adminEmail = appt.tenant.notificationEmail ?? appt.tenant.adminEmail
  if (!adminEmail) return
  const fullName   = [appt.patientName, appt.patientSurname].filter(Boolean).join(" ")

  return send(
    adminEmail,
    `Walk-in arrived — ${fullName} — ${appt.service.name}`,
    `<p style="font-family:sans-serif;color:#1C1007">A patient has checked in at the clinic.</p>
     ${table(
       row("Patient",   fullName),
       row("Phone",     appt.patientPhone),
       row("Email",     appt.patientEmail),
       row("Service",   appt.service.name),
       row("Reference", appt.bookingRef),
       ...(appt.branch ? [row("Branch", appt.branch.name)] : []),
     )}
     <p style="font-family:sans-serif">
       <a href="${bookingUrl(appt.tenant.slug)}/admin/queue" style="color:#436850;font-weight:bold">
         View walk-in queue →
       </a>
     </p>`
  )
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  return send(
    email,
    "Reset your password — Pikatym",
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#BF4646;border-radius:12px 12px 0 0;padding:28px 32px">
        ${pikatymEmailMark(36)}
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
      <p style="color:#C8C0B8;font-size:11px;text-align:center;margin:16px 0 0">Pikatym · outriftmedia</p>
    </div>`
  )
}

// ── Patient receives when appointment is marked COMPLETED ─────────────────────
export async function sendReviewRequestEmail(appt: FullAppointment, reviewLink: string) {
  const { patientName, patientEmail, bookingRef, service, tenant } = appt
  return send(
    patientEmail,
    `How was your visit? — ${tenant.name}`,
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#436850;border-radius:12px 12px 0 0;padding:24px 28px">
        <p style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px">Appointment complete</p>
        <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0">Thank you for your visit</h1>
      </div>
      <div style="background:#fff;border:1px solid #E8E3DC;border-top:none;border-radius:0 0 12px 12px;padding:28px">
        <p style="color:#1C1007;font-size:14px;margin:0 0 12px">Hi ${patientName},</p>
        <p style="color:#1C1007;font-size:14px;margin:0 0 20px">
          Thank you for choosing <strong>${tenant.name}</strong> for your <strong>${service.name}</strong> appointment (${bookingRef}).
          We hope everything went well. If you have a moment, we'd love to hear about your experience.
        </p>
        <a href="${reviewLink}"
           style="display:inline-block;background:#436850;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px">
          Leave a review →
        </a>
        <p style="color:#9A7A5A;font-size:12px;margin:20px 0 0">Thank you — it means a lot to us.</p>
      </div>
      <p style="color:#C8C0B8;font-size:11px;text-align:center;margin:16px 0 0">${tenant.name} · Powered by Pikatym</p>
    </div>`
  )
}

// ── Patient receives when a programme is confirmed ────────────────────────────
export async function sendProgrammeConfirmation(
  email:       string,
  patientName: string,
  serviceName: string,
  clinicName:  string,
  doctorName:  string,
  sessions:    { date: string; time: string }[],
) {
  const scheduleRows = sessions
    .map((s, i) => {
      const d = new Date(s.date + "T00:00:00.000Z")
      const dateStr = d.toLocaleDateString("en-GB", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
      })
      return `<tr>
        <td style="padding:4px 14px 4px 0;color:#9A7A5A;font-size:13px;white-space:nowrap">Day ${i + 1}</td>
        <td style="padding:4px 0;font-size:13px;font-weight:600">${dateStr} · ${s.time}</td>
      </tr>`
    })
    .join("")

  return send(
    email,
    `Programme confirmed — ${serviceName}`,
    `<div style="font-family:sans-serif;max-width:540px;margin:0 auto">
      <div style="background:#BF4646;border-radius:12px 12px 0 0;padding:24px 28px">
        <p style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px">Programme confirmed</p>
        <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0">${h(serviceName)}</h1>
      </div>
      <div style="background:#fff;border:1px solid #E8E3DC;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px">
        <p style="color:#1C1007;font-size:14px;margin:0 0 16px">
          Hi ${h(patientName)}, your <strong>${h(serviceName)}</strong> programme has been confirmed
          at <strong>${h(clinicName)}</strong> with <strong>${h(doctorName)}</strong>.
        </p>
        <p style="color:#1C1007;font-size:13px;font-weight:700;margin:0 0 10px">
          Your schedule — ${sessions.length} session${sessions.length !== 1 ? "s" : ""}
        </p>
        <table style="border-collapse:collapse;margin:0 0 20px">${scheduleRows}</table>
        <p style="color:#9A7A5A;font-size:12px;margin:0">
          Please bring comfortable clothing and arrive a few minutes early for your first session.
          Contact the clinic if you need to make any changes.
        </p>
      </div>
      <p style="color:#C8C0B8;font-size:11px;text-align:center;margin:16px 0 0">${h(clinicName)} · Powered by Pikatym</p>
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
     <p style="font-family:sans-serif;color:#1C1007">— outriftmedia / Pikatym</p>`
  )
}
