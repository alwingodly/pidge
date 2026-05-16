import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { z } from "zod"

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

const schema = z.object({
  slotIntervalMins: z.number().int().min(5).max(240).nullable().optional(),
  lunchBreakStart:  z.string().regex(timeRegex).or(z.literal("")).nullable().optional(),
  lunchBreakEnd:    z.string().regex(timeRegex).or(z.literal("")).nullable().optional(),
})

// GET — return the effective slot settings for the current branch (or tenant defaults)
export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId, branchId } = getScopeFromSession(session)

  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { slotIntervalMins: true, lunchBreakStart: true, lunchBreakEnd: true },
  })

  if (!branchId) {
    return Response.json({ data: { slotIntervalMins: tenant?.slotIntervalMins ?? 30, lunchBreakStart: tenant?.lunchBreakStart ?? null, lunchBreakEnd: tenant?.lunchBreakEnd ?? null, isOverride: false } })
  }

  const branch = await prisma.branch.findUnique({
    where:  { id: branchId, tenantId },
    select: { slotIntervalMins: true, lunchBreakStart: true, lunchBreakEnd: true },
  })

  return Response.json({
    data: {
      slotIntervalMins: branch?.slotIntervalMins ?? tenant?.slotIntervalMins ?? 30,
      lunchBreakStart:  branch?.lunchBreakStart  ?? tenant?.lunchBreakStart  ?? null,
      lunchBreakEnd:    branch?.lunchBreakEnd    ?? tenant?.lunchBreakEnd    ?? null,
      isOverride: branch?.slotIntervalMins != null || branch?.lunchBreakStart != null,
    },
  })
}

// PATCH — branch admins save their branch overrides; tenant admins save tenant defaults
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId, branchId } = getScopeFromSession(session)

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { slotIntervalMins, lunchBreakStart, lunchBreakEnd } = parsed.data

  // Validate break window
  if (lunchBreakStart && lunchBreakEnd && lunchBreakStart >= lunchBreakEnd)
    return Response.json({ error: "Break end must be after break start." }, { status: 400 })

  if (branchId) {
    await prisma.branch.update({
      where: { id: branchId, tenantId },
      data:  {
        ...(slotIntervalMins !== undefined ? { slotIntervalMins } : {}),
        ...(lunchBreakStart  !== undefined ? { lunchBreakStart: lunchBreakStart || null } : {}),
        ...(lunchBreakEnd    !== undefined ? { lunchBreakEnd:   lunchBreakEnd   || null } : {}),
      },
    })
  } else {
    await prisma.tenant.update({
      where: { id: tenantId },
      data:  {
        ...(slotIntervalMins !== undefined ? { slotIntervalMins: slotIntervalMins ?? 30 } : {}),
        ...(lunchBreakStart  !== undefined ? { lunchBreakStart: lunchBreakStart || null } : {}),
        ...(lunchBreakEnd    !== undefined ? { lunchBreakEnd:   lunchBreakEnd   || null } : {}),
      },
    })
  }

  return Response.json({ ok: true })
}
