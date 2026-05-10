"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Check, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { format } from "date-fns"

type Conflict = {
  id:           string
  bookingRef:   string
  patientName:  string
  assignedDate: string
  assignedTime: string
  service:      { name: string }
}

type Props = {
  initialStart: string | null
  initialEnd:   string | null
}

export default function ClinicHoursForm({ initialStart, initialEnd }: Props) {
  const router = useRouter()
  const [start,     setStart]     = useState(initialStart ?? "09:00")
  const [end,       setEnd]       = useState(initialEnd   ?? "17:00")
  const [loading,   setLoading]   = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [showWarn,  setShowWarn]  = useState(false)

  async function checkAndSave() {
    if (start >= end) { setError("Opening time must be before closing time."); return }
    setLoading(true); setError(null); setSaved(false)

    const res  = await fetch(`/api/clinic-hours/conflicts?startTime=${start}&endTime=${end}`)
    const data = await res.json()
    setLoading(false)

    if (data.count > 0) {
      setConflicts(data.data)
      setShowWarn(true)
      return
    }

    await save()
  }

  async function save() {
    setShowWarn(false)
    setLoading(true)
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
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="start" className="text-xs font-semibold text-muted-foreground">Opening time</Label>
          {timeInput("start", start, setStart)}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end" className="text-xs font-semibold text-muted-foreground">Closing time</Label>
          {timeInput("end", end, setEnd)}
        </div>
        <Button onClick={checkAndSave} disabled={loading || saved} size="sm" className="rounded-xl">
          {loading ? <><Loader2 className="size-4 animate-spin" /> Checking…</>
          : saved   ? <><Check   className="size-4" /> Saved</>
          :           "Save"}
        </Button>
        {error && <p className="text-sm text-destructive sm:col-span-3">{error}</p>}
      </div>

      {/* Conflict warning dialog */}
      <Dialog open={showWarn} onOpenChange={setShowWarn}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <AlertTriangle className="size-5" />
              </div>
              <DialogTitle className="text-base font-bold">
                {conflicts.length} appointment{conflicts.length !== 1 ? "s" : ""} conflict with these hours
              </DialogTitle>
              <DialogDescription className="sr-only">
                Review approved appointments that fall outside the proposed clinic hours.
              </DialogDescription>
            </div>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            The following approved appointments fall outside <strong>{start}–{end}</strong> and will need to be rescheduled.
          </p>

          <div className="max-h-56 overflow-y-auto rounded-xl border border-[#F3EAE0]">
            {conflicts.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b border-[#F3EAE0] px-4 py-2.5 last:border-b-0">
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.patientName}</p>
                  <p className="text-xs text-muted-foreground">{c.service.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-amber-700">{c.assignedTime}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(c.assignedDate), "d MMM yyyy")}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setShowWarn(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={save} disabled={loading}>
              {loading ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Save anyway"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
