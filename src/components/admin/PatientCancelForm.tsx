"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = { initialEnabled: boolean }

export default function PatientCancelForm({ initialEnabled }: Props) {
  const router                    = useRouter()
  const [enabled, setEnabled]     = useState(initialEnabled)
  const [saving,  setSaving]      = useState(false)
  const [saved,   setSaved]       = useState(false)
  const [error,   setError]       = useState<string | null>(null)

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    const res  = await fetch("/api/tenant", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ patientCancelEnabled: enabled }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? "Something went wrong."); return }
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-white px-4 py-3">
        <div
          role="switch"
          aria-checked={enabled}
          onClick={() => { setEnabled(v => !v); setSaved(false) }}
          className={cn(
            "relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            enabled ? "bg-primary" : "bg-muted"
          )}
        >
          <span className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform",
            enabled ? "translate-x-4" : "translate-x-0"
          )} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {enabled ? "Patients can cancel online" : "Online cancellation disabled"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {enabled
              ? "The cancel link is visible on the confirmation page."
              : "The cancel link is hidden. Patients will need to contact your clinic directly."}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={save} disabled={saving || saved} size="sm" className="rounded-xl">
        {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
        : saved  ? <><Check   className="size-4" /> Saved</>
        :          "Save"}
      </Button>
    </div>
  )
}
