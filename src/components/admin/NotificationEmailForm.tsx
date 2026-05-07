"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Mail, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type Props = {
  initialEnabled: boolean
  initialEmail:   string | null
  defaultEmail:   string   // tenant admin's email — shown as placeholder
}

export default function NotificationEmailForm({ initialEnabled, initialEmail, defaultEmail }: Props) {
  const router                      = useRouter()
  const [enabled, setEnabled]       = useState(initialEnabled)
  const [email,   setEmail]         = useState(initialEmail ?? "")
  const [loading, setLoading]       = useState(false)
  const [saved,   setSaved]         = useState(false)
  const [error,   setError]         = useState<string | null>(null)

  async function save() {
    setLoading(true); setError(null); setSaved(false)
    const res  = await fetch("/api/tenant", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ bookingAlertsEnabled: enabled, notificationEmail: email.trim() }),
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
          <p className="text-sm font-semibold text-foreground">Send new booking alerts</p>
          <p className="text-xs text-muted-foreground">Receive an email each time a patient submits a booking request.</p>
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

      {/* Email override — only shown when enabled */}
      {enabled && (
        <div className="space-y-1.5">
          <Label htmlFor="notif-email" className="text-xs font-semibold text-muted-foreground">
            Alert address <span className="font-normal">(optional override)</span>
          </Label>
          <div className="flex h-10 items-center gap-2 rounded-xl border border-[#E8E3DC] bg-white px-3 focus-within:ring-2 focus-within:ring-primary/20">
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <input
              id="notif-email"
              type="email"
              placeholder={defaultEmail}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setSaved(false); setError(null) }}
              className="min-w-0 flex-1 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            {email && (
              <button onClick={() => { setEmail(""); setSaved(false) }} className="text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Leave blank to use your account email ({defaultEmail}).
          </p>
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
