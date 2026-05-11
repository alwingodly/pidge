import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto"

const ALG = "aes-256-gcm"
const ENC = "enc:"

function masterKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY env var must be set to exactly 64 hex characters (32 bytes)")
  }
  return Buffer.from(hex, "hex")
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12) // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALG, masterKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag() // 128-bit auth tag
  return `${ENC}${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`
}

export function decrypt(value: string): string {
  if (!value.startsWith(ENC)) return value // backward-compat: return plain values as-is
  const [ivHex, tagHex, ctHex] = value.slice(ENC.length).split(":")
  const decipher = createDecipheriv(ALG, masterKey(), Buffer.from(ivHex, "hex"))
  decipher.setAuthTag(Buffer.from(tagHex, "hex"))
  return Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]).toString("utf8")
}

export function encryptField(v: string | null | undefined): string | null {
  if (!v) return v ?? null
  return encrypt(v)
}

export function decryptField(v: string | null | undefined): string | null {
  if (!v) return v ?? null
  return decrypt(v)
}

// HMAC-SHA256 used for short-lived OTP hashing (fast, single-use, time-limited)
export function hmacOTP(otp: string): string {
  const key = process.env.ENCRYPTION_KEY ?? process.env.AUTH_SECRET ?? ""
  return createHmac("sha256", key).update(otp).digest("hex")
}

const BOOKING_TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes

// Issues a short-lived signed token after OTP is verified.
// Appointments API validates this before creating a booking.
export function signBookingToken(email: string): string {
  const key       = process.env.ENCRYPTION_KEY ?? process.env.AUTH_SECRET ?? ""
  const expiresAt = Date.now() + BOOKING_TOKEN_TTL_MS
  const payload   = Buffer.from(`${email}:${expiresAt}`).toString("base64url")
  const sig       = createHmac("sha256", key).update(payload).digest("hex")
  return `${payload}.${sig}`
}

export function verifyBookingToken(token: string, email: string): boolean {
  try {
    const key             = process.env.ENCRYPTION_KEY ?? process.env.AUTH_SECRET ?? ""
    const [payload, sig]  = token.split(".")
    if (!payload || !sig) return false
    const expected    = createHmac("sha256", key).update(payload).digest()
    const sigBuf      = Buffer.from(sig, "hex")
    if (expected.length !== sigBuf.length || !timingSafeEqual(expected, sigBuf)) return false
    const decoded  = Buffer.from(payload, "base64url").toString("utf8")
    const [tokenEmail, expiresAtStr] = decoded.split(":")
    if (tokenEmail !== email) return false
    if (Date.now() > parseInt(expiresAtStr, 10)) return false
    return true
  } catch {
    return false
  }
}
