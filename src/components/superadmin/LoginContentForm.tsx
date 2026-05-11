"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PlatformLoginContentView } from "@/lib/platform-login-content"
import { Save, Sparkles, Building2, CalendarDays, Clock } from "lucide-react"

export default function LoginContentForm({ initial }: { initial: PlatformLoginContentView }) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function update(key: keyof PlatformLoginContentView, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    const res = await fetch("/api/superadmin/login-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Unable to save login content.")
      setSaving(false)
      return
    }

    setMessage("Login screen updated.")
    setSaving(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <Field label="Eyebrow" value={form.eyebrow} maxLength={48} onChange={(v) => update("eyebrow", v)} />
        <Field label="Headline" value={form.headline} maxLength={96} onChange={(v) => update("headline", v)} />
        <TextField label="Description" value={form.description} maxLength={220} onChange={(v) => update("description", v)} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Panel label" value={form.panelLabel} maxLength={32} onChange={(v) => update("panelLabel", v)} />
          <Field label="Status label" value={form.statusLabel} maxLength={32} onChange={(v) => update("statusLabel", v)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricField
            label="Metric 1"
            metricLabel={form.metricOneLabel}
            metricValue={form.metricOneValue}
            onLabel={(v) => update("metricOneLabel", v)}
            onValue={(v) => update("metricOneValue", v)}
          />
          <MetricField
            label="Metric 2"
            metricLabel={form.metricTwoLabel}
            metricValue={form.metricTwoValue}
            onLabel={(v) => update("metricTwoLabel", v)}
            onValue={(v) => update("metricTwoValue", v)}
          />
          <MetricField
            label="Metric 3"
            metricLabel={form.metricThreeLabel}
            metricValue={form.metricThreeValue}
            onLabel={(v) => update("metricThreeLabel", v)}
            onValue={(v) => update("metricThreeValue", v)}
          />
        </div>

        <TextField label="Footer note" value={form.footerNote} maxLength={140} onChange={(v) => update("footerNote", v)} />

        {error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {message && <p className="rounded-xl border border-[#85C641]/30 bg-[#85C641]/10 px-3 py-2 text-sm font-medium text-[#4E8E24]">{message}</p>}

        <Button type="submit" disabled={saving} className="h-10 gap-2 rounded-xl">
          <Save className="size-4" />
          {saving ? "Saving..." : "Save login content"}
        </Button>
      </div>

      <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Live preview</p>
        <div className="mt-5 space-y-4 rounded-3xl border border-border bg-[#F3F7FA] p-4">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE6ED] bg-white px-3 py-1.5 text-xs font-semibold text-[#4996D7] shadow-sm">
            <Sparkles className="size-3" />
            {form.eyebrow || "Eyebrow text"}
          </div>

          {/* Headline + description */}
          <div>
            <p className="text-lg font-bold leading-snug text-[#162332]">
              {form.headline || "Headline"}
            </p>
            <p className="mt-2 text-xs leading-5 text-[#657281]">
              {form.description || "Description"}
            </p>
          </div>

          {/* Glass cards preview */}
          <div className="grid grid-cols-3 gap-2">
            <PreviewGlassCard icon={<Building2 className="size-3.5" />} tint="bg-[#4996D7]/10" iconColor="text-[#4996D7]" accent="#4996D7" value={form.metricOneValue} label={form.metricOneLabel} />
            <PreviewGlassCard icon={<CalendarDays className="size-3.5" />} tint="bg-[#FFC12B]/10" iconColor="text-[#C28E00]" accent="#FFC12B" value={form.metricTwoValue} label={form.metricTwoLabel} />
            <PreviewGlassCard icon={<Clock className="size-3.5" />} tint="bg-[#F16667]/10" iconColor="text-[#C94445]" accent="#F16667" value={form.metricThreeValue} label={form.metricThreeLabel} />
          </div>

          {/* Footer note */}
          <p className="text-[10px] text-[#A8B8C5]">{form.footerNote || "Footer note"}</p>
        </div>
      </aside>
    </form>
  )
}

function Field({ label, value, maxLength, onChange }: {
  label: string
  value: string
  maxLength: number
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} className="rounded-xl" />
    </div>
  )
}

function TextField({ label, value, maxLength, onChange }: {
  label: string
  value: string
  maxLength: number
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <textarea
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
      />
    </div>
  )
}

function MetricField({
  label,
  metricLabel,
  metricValue,
  onLabel,
  onValue,
}: {
  label: string
  metricLabel: string
  metricValue: string
  onLabel: (value: string) => void
  onValue: (value: string) => void
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <Input value={metricValue} maxLength={16} onChange={(e) => onValue(e.target.value)} className="h-9 rounded-lg font-semibold" />
      <Input value={metricLabel} maxLength={24} onChange={(e) => onLabel(e.target.value)} className="h-9 rounded-lg text-xs" />
    </div>
  )
}

function PreviewGlassCard({ icon, tint, iconColor, accent, value, label }: {
  icon: React.ReactNode
  tint: string
  iconColor: string
  accent: string
  value: string
  label: string
}) {
  return (
    <div className="rounded-xl bg-white/70 p-2.5 shadow-sm ring-1 ring-white backdrop-blur-xl">
      <div className={`inline-flex size-6 items-center justify-center rounded-lg ${tint} ${iconColor}`}>
        {icon}
      </div>
      <p className="mt-2 text-sm font-bold text-[#162332]">{value}</p>
      <div className="mt-1 h-0.5 w-4 rounded-full" style={{ backgroundColor: accent }} />
      <p className="mt-1 truncate text-[9px] font-semibold uppercase tracking-wider text-[#A8B8C5]">{label}</p>
    </div>
  )
}
