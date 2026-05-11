"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react"

function ResetPasswordForm() {
  const router      = useRouter()
  const params      = useSearchParams()
  const token       = params.get("token") ?? ""

  const [password,  setPassword]  = useState("")
  const [confirm,   setConfirm]   = useState("")
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // No token in URL — show an error immediately
  const noToken = !token

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords do not match."); return }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return }

    setLoading(true)
    setError(null)

    const res  = await fetch("/api/reset-password", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token, password }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.")
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push("/admin/login"), 3000)
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#FFF4EA" }}>

      {/* Brand panel */}
      <div className="hidden w-80 flex-col justify-between p-10 lg:flex" style={{ background: "#BF4646" }}>
        <div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/20">
            <Image src="/pikatym-white.svg" alt="Pikatym" width={20} height={30} className="h-7 w-auto object-contain" priority />
          </div>
          <h1 className="mt-8 text-3xl font-bold leading-tight text-white">Choose a new<br />password.</h1>
          <p className="mt-3 text-sm text-white/70">Make it strong and unique.</p>
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

          {noToken ? (
            <div className="space-y-4">
              <ShieldAlert className="size-10 text-amber-500" />
              <h2 className="text-xl font-bold text-foreground">Invalid reset link</h2>
              <p className="text-sm text-muted-foreground">
                This link is missing a reset token. Please request a new one.
              </p>
              <Link href="/admin/forgot-password" className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <ArrowLeft className="size-4" /> Request new link
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <CheckCircle2 className="size-12 text-emerald-500" />
              <h2 className="text-2xl font-bold text-foreground">Password updated!</h2>
              <p className="text-sm text-muted-foreground">
                Your password has been changed. Redirecting you to sign in…
              </p>
              <Link href="/admin/login" className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                Sign in now →
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-foreground">Set new password</h2>
              <p className="mb-8 mt-1 text-sm text-muted-foreground">
                Choose a strong password with at least 8 characters.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className="h-11 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <PasswordInput
                    id="confirm"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    className="h-11 bg-white"
                  />
                  {/* Live match indicator */}
                  {confirm.length > 0 && (
                    <p className={`text-xs font-medium ${password === confirm ? "text-emerald-600" : "text-red-500"}`}>
                      {password === confirm ? "✓ Passwords match" : "Passwords do not match"}
                    </p>
                  )}
                </div>

                {error && (
                  <p className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-primary">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || password !== confirm || password.length < 8}
                  className="mt-2 h-11 w-full rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
                  style={{ background: "#BF4646" }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.background = "#A03A3A")}
                  onMouseLeave={e => !loading && (e.currentTarget.style.background = "#BF4646")}
                >
                  {loading ? "Updating…" : "Update password →"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
