"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const INTERVALS = [
  { value: 15,  label: "15 min" },
  { value: 30,  label: "30 min" },
  { value: 45,  label: "45 min" },
  { value: 60,  label: "1 hour" },
  { value: 90,  label: "1.5 hrs" },
  { value: 120, label: "2 hrs" },
]

type Props = {
  initialInterval:    number
  initialBreakStart:  string | null
  initialBreakEnd:    string | null
  isBranchAdmin:      boolean
}

export default function SlotSettingsForm({ initialInterval, initialBreakStart, initialBreakEnd, isBranchAdmin }: Props) {
  const router = useRouter()

  const [interval,    setInterval]    = useState(initialInterval)
  const [customMins,  setCustomMins]  = useState(INTERVALS.some(i => i.value === initialInterval) ? "" : String(initialInterval))
  const [breakOn,     setBreakOn]     = useState(!!(initialBreakStart && initialBreakEnd))
  const [breakStart,  setBreakStart]  = useState(initialBreakStart ?? "13:00")
  const [breakEnd,    setBreakEnd]    = useState(initialBreakEnd   ?? "14:00")
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const effectiveInterval = customMins ? (parseInt(customMins) || interval) : interval
  const isCustom = !INTERVALS.some(i => i.value === interval) || !!customMins

  async function save() {
    if (breakOn && breakStart >= breakEnd) {
      setError("Break end must be after break start."); return
    }
    setSaving(true); setError(null); setSaved(false)
    const res = await fetch("/api/branches/schedule", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        slotIntervalMins: effectiveInterval,
        lunchBreakStart:  breakOn ? breakStart : "",
        lunchBreakEnd:    breakOn ? breakEnd   : "",
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? "Something went wrong."); return }
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2500)
  }

  const timeInput = (id: string, value: string, onChange: (v: string) => void) => (
    <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-3 focus-within:ring-2 focus-within:ring-primary/20">
      <Clock className="size-4 shrink-0 text-muted-foreground" />
      <input
        id={id}
        type="time"
        value={value}
        onChange={e => { onChange(e.target.value); setSaved(false) }}
        className="flex-1 text-sm font-semibold text-foreground outline-none"
      />
    </div>
  )

  return (
    <div className="space-y-5">
      {isBranchAdmin && (
        <p className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          These settings override the clinic-wide defaults for your branch only.
        </p>
      )}

      {/* Slot interval */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">Appointment slot interval</Label>
        <p className="text-xs text-muted-foreground">
          How far apart each time slot appears in the scheduling grid. Match this to your most common service duration.
        </p>
        <div className="flex flex-wrap gap-2">
          {INTERVALS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setInterval(opt.value); setCustomMins(""); setSaved(false) }}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                interval === opt.value && !customMins
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white text-foreground hover:border-primary/40"
              )}
            >
              {opt.label}
            </button>
          ))}
          <div className={cn(
            "flex h-10 items-center gap-2 rounded-xl border px-3 transition-colors",
            isCustom && customMins ? "border-primary ring-2 ring-primary/20" : "border-border"
          )}>
            <input
              type="number"
              min="5"
              max="240"
              placeholder="Custom"
              value={customMins}
              onChange={e => {
                setCustomMins(e.target.value)
                setSaved(false)
                if (e.target.value) setInterval(0)
              }}
              className="w-16 text-sm font-semibold text-foreground outline-none bg-transparent placeholder:text-muted-foreground"
            />
            <span className="text-xs text-muted-foreground">min</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Current: <strong>{effectiveInterval} min intervals</strong>.{" "}
          {effectiveInterval === 30 && "The admin sees 09:00, 09:30, 10:00…"}
          {effectiveInterval === 60 && "The admin sees 09:00, 10:00, 11:00…"}
          {effectiveInterval === 90 && "The admin sees 09:00, 10:30, 12:00…"}
        </p>
      </div>

      {/* Lunch break */}
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-white px-4 py-3">
          <div
            role="switch"
            aria-checked={breakOn}
            onClick={() => { setBreakOn(v => !v); setSaved(false) }}
            className={cn(
              "relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              breakOn ? "bg-primary" : "bg-muted"
            )}
          >
            <span className={cn(
              "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform",
              breakOn ? "translate-x-4" : "translate-x-0"
            )} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Lunch / break time</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Slots during this window are hidden from the scheduling grid. Useful for lunch breaks or shift changes.
            </p>
          </div>
        </div>

        {breakOn && (
          <div className="grid grid-cols-2 gap-3 pl-2">
            <div className="space-y-1.5">
              <Label htmlFor="break-start" className="text-xs font-semibold text-muted-foreground">Break starts</Label>
              {timeInput("break-start", breakStart, setBreakStart)}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="break-end" className="text-xs font-semibold text-muted-foreground">Break ends</Label>
              {timeInput("break-end", breakEnd, setBreakEnd)}
            </div>
            <p className="col-span-2 text-xs text-muted-foreground">
              Example: 13:00 – 14:00 hides the 13:00 and 13:30 slots and shows 14:00 as the next available.
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={save} disabled={saving || saved} size="sm" className="rounded-xl">
        {saving  ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
        : saved  ? <><Check   className="size-4" /> Saved</>
        :           "Save settings"}
      </Button>
    </div>
  )
}
