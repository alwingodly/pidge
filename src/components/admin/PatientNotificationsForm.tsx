"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  initialAssignment: boolean
  initialReschedule: boolean
}

const TOGGLES = [
  {
    key:     "assignmentEmailEnabled" as const,
    label:   "Assignment confirmation",
    desc:    "Email patient when their appointment is approved and a clinician is assigned.",
  },
  {
    key:     "rescheduleEmailEnabled" as const,
    desc:    "Email patient when their confirmed appointment is rescheduled.",
    label:   "Reschedule notification",
  },
]

export default function PatientNotificationsForm({ initialAssignment, initialReschedule }: Props) {
  const router = useRouter()
  const [values,  setValues]  = useState({
    assignmentEmailEnabled: initialAssignment,
    rescheduleEmailEnabled: initialReschedule,
  })
  const [loading, setLoading] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function save() {
    setLoading(true); setError(null); setSaved(false)
    const res  = await fetch("/api/tenant", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(values),
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
      {TOGGLES.map(({ key, label, desc }) => (
        <div key={key} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
          <button
            role="switch"
            aria-checked={values[key]}
            onClick={() => { setValues(v => ({ ...v, [key]: !v[key] })); setSaved(false) }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${values[key] ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${values[key] ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-3 pt-1">
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
