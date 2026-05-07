import crypto from "crypto"
import { v4 as uuidv4 } from "uuid"

export function generateBookingRef(): string {
  const year = new Date().getFullYear()
  const seq  = crypto.randomBytes(3).toString("hex").toUpperCase()
  return `PIG-${year}-${seq}`
}

export function generateCancelToken(): string {
  return uuidv4()
}
