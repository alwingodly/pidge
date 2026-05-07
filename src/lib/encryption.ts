import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto"

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
