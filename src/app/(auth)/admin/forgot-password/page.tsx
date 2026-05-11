"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState("")
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await fetch("/api/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      })
      // Always show success — never leak whether the email exists
      setSubmitted(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#FFF4EA" }}>

      {/* Brand panel */}
      <div className="hidden w-80 flex-col justify-between p-10 lg:flex" style={{ background: "#BF4646" }}>
        <div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/20">
            <Image src="/pikatym-white.svg" alt="Pikatym" width={20} height={30} className="h-7 w-auto object-contain" priority />
          </div>
          <h1 className="mt-8 text-3xl font-bold leading-tight text-white">Reset your<br />password.</h1>
          <p className="mt-3 text-sm text-white/70">
            We&apos;ll send a secure link to your email address.
          </p>
        </div>
        <p className="text-xs text-white/40">Pikatym · outriftmedia</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg" style={{ background: "#BF4646" }}>
              <Image src="/pikatym-white.svg" alt="Pikatym" width={16} height={24} className="h-6 w-auto object-contain" />
            </div>
            <span className="font-bold text-foreground">Pikatym Admin</span>
          </div>

          {submitted ? (
            /* Success state */
            <div className="space-y-5">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Mail className="size-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Check your email</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  If <strong>{email}</strong> is registered, you&apos;ll receive a password reset link shortly. The link expires in 1 hour.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Didn&apos;t get it? Check your spam folder, or{" "}
                <button
                  onClick={() => { setSubmitted(false); setEmail("") }}
                  className="font-semibold text-primary hover:underline"
                >
                  try again
                </button>.
              </p>
              <Link href="/admin/login" className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <ArrowLeft className="size-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <h2 className="text-2xl font-bold text-foreground">Forgot password?</h2>
              <p className="mb-8 mt-1 text-sm text-muted-foreground">
                Enter your admin email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@clinic.com"
                    className="h-11 bg-white"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-primary">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 h-11 w-full rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
                  style={{ background: "#BF4646" }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.background = "#A03A3A")}
                  onMouseLeave={e => !loading && (e.currentTarget.style.background = "#BF4646")}
                >
                  {loading ? "Sending…" : "Send reset link →"}
                </button>

                <Link href="/admin/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="size-3.5" /> Back to sign in
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
