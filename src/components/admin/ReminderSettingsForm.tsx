"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

const HOUR_OPTIONS = [
  { label: "24 hours before (day before)",    value: 24  },
  { label: "48 hours before (2 days before)", value: 48  },
  { label: "72 hours before (3 days before)", value: 72  },
]

type Props = {
  initialEnabled:      boolean
  initialHoursBefore:  number
}

export default function ReminderSettingsForm({ initialEnabled, initialHoursBefore }: Props) {
  const router                    = useRouter()
  const [enabled,  setEnabled]    = useState(initialEnabled)
  const [hours,    setHours]      = useState(initialHoursBefore)
  const [loading,  setLoading]    = useState(false)
  const [saved,    setSaved]      = useState(false)
  const [error,    setError]      = useState<string | null>(null)

  async function save() {
    setLoading(true); setError(null); setSaved(false)
    const res  = await fetch("/api/tenant", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ reminderEnabled: enabled, reminderHoursBefore: hours }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? "Something went wrong."); return }
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Send reminder emails</p>
          <p className="text-xs text-muted-foreground">Patients receive a reminder before their appointment.</p>
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          onClick={() => { setEnabled(!enabled); setSaved(false) }}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${enabled ? "bg-primary" : "bg-muted"}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
      </div>

      {/* Hours select — only shown when enabled */}
      {enabled && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">When to send</Label>
          <select
            value={hours}
            onChange={(e) => { setHours(Number(e.target.value)); setSaved(false) }}
            className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          >
            {HOUR_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={loading || saved} size="sm" className="rounded-xl">
          {loading ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
          : saved   ? <><Check   className="size-4" /> Saved</>
          :           "Save"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
