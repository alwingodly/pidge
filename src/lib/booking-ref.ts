import { v4 as uuidv4 } from "uuid"

export async function generateBookingRef(tx: { appointment: { count: () => Promise<number> } }): Promise<string> {
  const year  = new Date().getFullYear()
  const count = await tx.appointment.count()
  const seq   = String(count + 1).padStart(4, "0")
  return `PIG-${year}-${seq}`
}

export function generateCancelToken(): string {
  return uuidv4()
}
