"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type Props = {
  initialStart: string | null
  initialEnd:   string | null
}

export default function ClinicHoursForm({ initialStart, initialEnd }: Props) {
  const router = useRouter()
  const [start,   setStart]   = useState(initialStart ?? "09:00")
  const [end,     setEnd]     = useState(initialEnd   ?? "17:00")
  const [loading, setLoading] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSave() {
    if (start >= end) { setError("Opening time must be before closing time."); return }
    setLoading(true); setError(null); setSaved(false)

    const res  = await fetch("/api/tenant", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ clinicStartTime: start, clinicEndTime: end }),
    })
    const data = await res.json()

    setLoading(false)
    if (!res.ok) { setError(data.error ?? "Something went wrong."); return }
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2500)
  }

  const timeInput = (id: string, value: string, onChange: (v: string) => void) => (
    <div className="flex h-10 items-center gap-2 rounded-xl border border-[#E8E3DC] bg-white px-3 focus-within:ring-2 focus-within:ring-primary/20">
      <Clock className="size-4 shrink-0 text-muted-foreground" />
      <input
        id={id}
        type="time"
        value={value}
        onChange={(e) => { onChange(e.target.value); setSaved(false); setError(null) }}
        className="flex-1 text-sm font-semibold text-foreground outline-none"
      />
    </div>
  )

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="start" className="text-xs font-semibold text-muted-foreground">Opening time</Label>
        {timeInput("start", start, setStart)}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="end" className="text-xs font-semibold text-muted-foreground">Closing time</Label>
        {timeInput("end", end, setEnd)}
      </div>

      <Button
        onClick={handleSave}
        disabled={loading || saved}
        size="sm"
        className="rounded-xl"
      >
        {loading ? (
          <><Loader2 className="size-4 animate-spin" /> Saving…</>
        ) : saved ? (
          <><Check className="size-4" /> Saved</>
        ) : (
          "Save"
        )}
      </Button>

      {error && (
        <p className="text-sm text-destructive sm:col-span-3">{error}</p>
      )}
    </div>
  )
}
