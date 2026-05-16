import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getScopeFromSession } from "@/lib/tenant"

function toMins(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}
function toTimeStr(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`
}
function overlaps(s: string, dur: number, es: string, edur: number) {
  const aS = toMins(s), aE = aS + dur, bS = toMins(es), bE = bS + edur
  return aS < bE && aE > bS
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setUTCDate(r.getUTCDate() + n); return r
}
function addMonths(d: Date, n: number) {
  const r = new Date(d); r.setUTCMonth(r.getUTCMonth() + n); return r
}
function dateStr(d: Date) { return d.toISOString().slice(0, 10) }

// Walk forward collecting N working dates (skipping off days + full leaves)
function collectWorkingDays(
  start:       Date,
  count:       number,
  activeDays:  Set<number>,             // set of active dayOfWeek (0=Sun..6=Sat)
  leaveDates:  Set<string>,             // set of YYYY-MM-DD strings on full leave
): Date[] {
  const result: Date[] = []
  let cursor = new Date(start)
  let guard  = 0
  while (result.length < count && guard < count * 7 + 60) {
    const dow = cursor.getUTCDay()
    if (activeDays.has(dow) && !leaveDates.has(dateStr(cursor))) {
      result.push(new Date(cursor))
    }
    cursor = addDays(cursor, 1)
    guard++
  }
  return result
}

// For WEEKLY / FORTNIGHTLY / MONTHLY: fixed interval but shift to next working day if off/leave
function shiftToNextWorkingDay(
  date:       Date,
  activeDays: Set<number>,
  leaveDates: Set<string>,
): Date {
  let cursor = new Date(date)
  for (let i = 0; i < 14; i++) {
    if (activeDays.has(cursor.getUTCDay()) && !leaveDates.has(dateStr(cursor))) return cursor
    cursor = addDays(cursor, 1)
  }
  return date // fallback — return original if no working day found in 2 weeks
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || !["TENANT_ADMIN", "BRANCH_ADMIN"].includes(session.user.role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { tenantId, branchId } = getScopeFromSession(session)

  const sp        = req.nextUrl.searchParams
  const doctorId  = sp.get("doctorId")
  const startDate = sp.get("startDate")
  const frequency = sp.get("frequency") ?? "DAILY"
  const sessions  = Math.min(parseInt(sp.get("sessions") ?? "4"), 60)
  const time      = sp.get("time") ?? "09:00"
  const serviceId = sp.get("serviceId")

  if (!doctorId || !startDate || !serviceId) {
    return Response.json({ error: "doctorId, startDate and serviceId are required" }, { status: 400 })
  }

  const base = new Date(startDate + "T00:00:00.000Z")

  // Fetch service, working hours, and leaves in parallel
  // Verify doctor is within the admin's branch scope before allowing preview
  const doctorCheck = await prisma.doctor.findUnique({
    where:  { id: doctorId, tenantId, ...(branchId ? { branchId } : {}) },
    select: { id: true },
  })
  if (!doctorCheck) return Response.json({ error: "Doctor not found" }, { status: 404 })

  const [service, workingHours, leaves, tenant, branch] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId, tenantId }, select: { durationMins: true } }),
    prisma.workingHours.findMany({ where: { doctorId, tenantId } }),
    prisma.doctorLeave.findMany({
      where: {
        doctorId, tenantId,
        period:    "FULL",
        startDate: { lte: addDays(base, sessions * 7 + 60) },
        endDate:   { gte: base },
      },
      select: { startDate: true, endDate: true },
    }),
    prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { slotIntervalMins: true, lunchBreakStart: true, lunchBreakEnd: true },
    }),
    branchId ? prisma.branch.findUnique({
      where:  { id: branchId, tenantId },
      select: { slotIntervalMins: true, lunchBreakStart: true, lunchBreakEnd: true },
    }) : Promise.resolve(null),
  ])

  if (!service) return Response.json({ error: "Service not found" }, { status: 404 })
  const duration     = service.durationMins
  const slotInterval = branch?.slotIntervalMins ?? tenant?.slotIntervalMins ?? 30
  const lunchStart   = branch?.lunchBreakStart  ?? tenant?.lunchBreakStart  ?? null
  const lunchEnd     = branch?.lunchBreakEnd    ?? tenant?.lunchBreakEnd    ?? null

  // Build lookup structures — fall back to Mon–Fri when no working hours are configured
  const activeDays = workingHours.some(h => h.isActive)
    ? new Set(workingHours.filter(h => h.isActive).map(h => h.dayOfWeek))
    : new Set([1, 2, 3, 4, 5])
  const leaveDates = new Set<string>()
  for (const leave of leaves) {
    let cursor = new Date(leave.startDate)
    while (cursor <= leave.endDate) {
      leaveDates.add(dateStr(cursor))
      cursor = addDays(cursor, 1)
    }
  }

  // Generate dates based on frequency
  let dates: Date[]
  if (frequency === "DAILY") {
    // Consecutive working days — skip off days and leaves
    dates = collectWorkingDays(base, sessions, activeDays, leaveDates)
  } else {
    // Fixed interval (weekly/fortnightly/monthly) — shift to next working day if needed
    dates = Array.from({ length: sessions }, (_, i) => {
      let raw: Date
      if (frequency === "WEEKLY")      raw = addDays(base, 7 * i)
      else if (frequency === "FORTNIGHTLY") raw = addDays(base, 14 * i)
      else raw = addMonths(base, i)
      return shiftToNextWorkingDay(raw, activeDays, leaveDates)
    })
  }

  // Fetch all existing appointments in the full date range
  const lastDate = dates[dates.length - 1] ?? base
  const existingAppts = await prisma.appointment.findMany({
    where: {
      doctorId, tenantId,
      status:       { in: ["PENDING", "APPROVED"] },
      assignedDate: { gte: base, lte: addDays(lastDate, 1) },
      assignedTime: { not: null },
    },
    select: {
      assignedDate: true,
      assignedTime: true,
      service:      { select: { durationMins: true } },
    },
  })

  const days = dates.map((date, i) => {
    const ds      = dateStr(date)
    const wh      = workingHours.find(h => h.dayOfWeek === date.getUTCDay() && h.isActive)!
    const dayAppts = existingAppts.filter(a => a.assignedDate?.toISOString().slice(0, 10) === ds)

    const startMins = toMins(wh.startTime)
    const endMins   = toMins(wh.endTime)

    // Generate slots using configured interval, split at lunch break
    const allSlots: string[] = []
    const ranges: Array<[number, number]> = lunchStart && lunchEnd
      ? [[startMins, toMins(lunchStart)], [toMins(lunchEnd), endMins]]
      : [[startMins, endMins]]
    for (const [rStart, rEnd] of ranges) {
      for (let m = rStart; m + duration <= rEnd; m += slotInterval) allSlots.push(toTimeStr(m))
    }

    // Remove conflicting slots
    const freeSlots = allSlots.filter(slot =>
      !dayAppts.some(a => a.assignedTime && overlaps(slot, duration, a.assignedTime, a.service?.durationMins ?? duration))
    )

    if (freeSlots.length === 0) {
      return { index: i + 1, date: ds, status: "full" as const, suggestedTime: null, freeSlots: [] }
    }

    const preferredFree = freeSlots.includes(time)
    const suggestedTime = preferredFree
      ? time
      : (freeSlots.find(s => toMins(s) > toMins(time)) ?? freeSlots[0])

    return {
      index:         i + 1,
      date:          ds,
      status:        (preferredFree ? "free" : "conflict") as "free" | "conflict",
      suggestedTime,
      freeSlots,
    }
  })

  return Response.json({ days })
}
