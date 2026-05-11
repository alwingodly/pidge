"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { ArrowRight, CheckCircle2, Sparkles, Building2, CalendarDays, Clock } from "lucide-react"
import type { PlatformLoginContentView } from "@/lib/platform-login-content"

export default function LoginScreen({ content }: { content: PlatformLoginContentView }) {
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
    <div className="relative min-h-screen overflow-hidden bg-[#F3F7FA]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-64 bg-linear-to-b from-white to-transparent" />
        <div className="absolute -left-24 top-24 size-80 rounded-full bg-[#4996D7]/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 size-96 rounded-full bg-[#85C641]/16 blur-3xl" />
      </div>

      <main className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:px-8">

        {/* Left: brand story */}
        <section className="hidden lg:block">
          <div className="mb-14 flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl bg-[#162332] px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pikatym-white.svg" alt="Pikatym" className="h-5 w-auto" />
            </div>
            <span className="text-xs text-[#A8B8C5]">by Outrift</span>
          </div>

          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#DCE6ED] bg-white px-3 py-1.5 text-xs font-semibold text-[#4996D7] shadow-sm">
              <Sparkles className="size-3.5" />
              {content.eyebrow}
            </p>
            <h1 className="mt-6 text-5xl font-bold leading-[1.03] tracking-tight text-[#162332]">
              {content.headline}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#657281]">
              {content.description}
            </p>
          </div>

          {/* Glass bento cards */}
          <div className="relative mt-12 max-w-lg">
            {/* Soft background blobs so glass reads on light bg */}
            <div className="pointer-events-none absolute -left-8 -top-8 size-56 rounded-full bg-[#4996D7]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-4 right-0 size-44 rounded-full bg-[#85C641]/10 blur-3xl" />

            <div className="relative grid grid-cols-[1fr_1fr_1fr] gap-3">
              <GlassCard
                icon={<Building2 className="size-4" />}
                tint="bg-[#4996D7]/10"
                iconColor="text-[#4996D7]"
                accent="#4996D7"
                value={content.metricOneValue}
                label={content.metricOneLabel}
              />
              <GlassCard
                icon={<CalendarDays className="size-4" />}
                tint="bg-[#FFC12B]/10"
                iconColor="text-[#C28E00]"
                accent="#FFC12B"
                value={content.metricTwoValue}
                label={content.metricTwoLabel}
              />
              <GlassCard
                icon={<Clock className="size-4" />}
                tint="bg-[#F16667]/10"
                iconColor="text-[#C94445]"
                accent="#F16667"
                value={content.metricThreeValue}
                label={content.metricThreeLabel}
              />
            </div>
          </div>
        </section>

        {/* Right: login form */}
        <section className="mx-auto w-full max-w-107.5">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex items-center justify-center rounded-xl bg-[#162332] px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pikatym-white.svg" alt="Pikatym" className="h-5 w-auto" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-foreground">Pikatym</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">by Outrift</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white bg-white p-6 shadow-[0_24px_80px_rgba(22,35,50,0.12)] sm:p-8">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4996D7]">Secure access</p>
              <h2 className="mt-3 text-2xl font-bold text-[#162332]">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-[#657281]">
                Sign in to manage your platform, tenants, and clinic workspaces.
              </p>
            </div>

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
                  placeholder="you@company.com"
                  className="h-11 rounded-xl border-[#DCE6ED] bg-[#F8FBFD]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/admin/forgot-password" className="text-xs font-medium text-[#657281] transition-colors hover:text-[#4996D7]">
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
                  className="h-11 rounded-xl border-[#DCE6ED] bg-[#F8FBFD]"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-[#F16667]/25 bg-[#F16667]/10 px-3 py-2 text-sm text-[#C94445]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4996D7] text-sm font-semibold text-white shadow-lg shadow-[#4996D7]/20 transition-all hover:-translate-y-0.5 hover:bg-[#2F7FC1] disabled:translate-y-0 disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
                {!loading && <ArrowRight className="size-4" />}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-2 rounded-2xl bg-[#F3F7FA] px-3 py-2 text-xs text-[#657281]">
              <CheckCircle2 className="size-4 text-[#85C641]" />
              {content.footerNote}
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}

function GlassCard({
  icon, tint, iconColor, accent, value, label,
}: {
  icon: React.ReactNode
  tint: string
  iconColor: string
  accent: string
  value: string
  label: string
}) {
  return (
    <div className="rounded-2xl bg-white/70 p-4 shadow-[0_4px_24px_rgba(22,35,50,0.07)] ring-1 ring-white backdrop-blur-xl">
      <div className={`inline-flex size-9 items-center justify-center rounded-xl ${tint} ${iconColor}`}>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold text-[#162332]">{value}</p>
      <div className="mt-1.5 h-0.75 w-6 rounded-full" style={{ backgroundColor: accent }} />
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A8B8C5]">{label}</p>
    </div>
  )
}
