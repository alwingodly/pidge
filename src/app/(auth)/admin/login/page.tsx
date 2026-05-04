"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
    <div className="min-h-screen flex" style={{ background: "#FFF4EA" }}>
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-80 p-10"
        style={{ background: "#BF4646" }}>
        <div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-white text-lg">
            P
          </div>
          <h1 className="text-white font-bold text-3xl mt-8 leading-tight">
            Welcome<br />back.
          </h1>
          <p className="text-white/70 text-sm mt-3">
            Manage your clinic, doctors, and appointments from one place.
          </p>
        </div>
        <p className="text-white/40 text-xs">Pidge · OutRift Technologies</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm"
              style={{ background: "#BF4646" }}>P</div>
            <span className="font-bold text-foreground">Pidge Admin</span>
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
                className="h-11 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11 bg-white"
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
              className="w-full h-11 rounded-lg font-semibold text-sm text-white transition-all mt-2 disabled:opacity-60"
              style={{ background: "#BF4646" }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "#A03A3A")}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "#BF4646")}
            >
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
