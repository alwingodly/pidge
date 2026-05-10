"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await signIn("credentials", { email, password, redirect: false })

    if (res?.error) {
      setError("Invalid email or password.")
      setLoading(false)
    } else {
      const session = await getSession()
      router.push(session?.user.role === "SUPER_ADMIN" ? "/superadmin" : "/admin")
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--login-page-bg)" }}>
      {/* Left brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-80 p-10"
        style={{ background: "var(--login-panel-bg)" }}
      >
        <div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "var(--login-badge-bg)", color: "var(--login-panel-fg)" }}
          >
            <Image src="/pikatym-white.svg" alt="Pikatym" width={20} height={30} className="h-7 w-auto object-contain" priority />
          </div>
          <h1 className="font-bold text-3xl mt-8 leading-tight" style={{ color: "var(--login-panel-fg)" }}>
            Welcome<br />back.
          </h1>
          <p className="text-sm mt-3" style={{ color: "var(--login-panel-muted)" }}>
            Manage your clinic, doctors, and appointments from one place.
          </p>
        </div>
        <p className="text-xs" style={{ color: "var(--login-panel-faint)" }}>Pikatym · OutRift Technologies</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "var(--login-panel-bg)", color: "var(--login-btn-fg)" }}
            >
              <Image src="/pikatym-white.svg" alt="Pikatym" width={16} height={24} className="h-6 w-auto object-contain" />
            </div>
            <span className="font-bold text-foreground">Pikatym Admin</span>
          </div>

          <h2 className="text-foreground text-2xl font-bold mb-1">Sign in</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Enter your credentials to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@clinic.com"
                className="h-11"
                style={{ background: "var(--login-input-bg)" }}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/admin/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11"
                style={{ background: "var(--login-input-bg)" }}
              />
            </div>

            {error && (
              <p className="text-sm rounded-lg px-3 py-2 bg-secondary text-primary border border-border">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg font-semibold text-sm transition-all mt-2 disabled:opacity-60"
              style={{ background: "var(--login-btn-bg)", color: "var(--login-btn-fg)" }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "var(--login-btn-hover)" }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "var(--login-btn-bg)" }}
            >
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
