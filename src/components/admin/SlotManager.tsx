"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { DatePickerButton } from "@/components/ui/date-picker"
import { Trash2, CalendarOff, Check, Search, X } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

type Service = { id: string; name: string; durationMins: number }
type Doctor  = { id: string; name: string; speciality: string; services: Service[] }
type Slot    = { id: string; startTime: string; endTime: string; isBooked: boolean }

const PERIODS = [
  { label: "Morning",   from: "06:00", to: "12:00" },
  { label: "Afternoon", from: "12:00", to: "17:00" },
  { label: "Evening",   from: "17:00", to: "22:00" },
]

const C = {
  primary:    "#BF4646",
  primaryHov: "#A03A3A",
  teal:       "#7EACB5",
  tealLight:  "#EAF4F6",
  beige:      "#EDDCC6",
  cream:      "#FFF4EA",
  border:     "#E8DCCB",
}

function generateTimes(from: string, to: string, dur: number) {
  const times: string[] = []
  const [fh, fm] = from.split(":").map(Number)
  const [th, tm] = to.split(":").map(Number)
  let cur = fh * 60 + fm
  const end = th * 60 + tm
  while (cur + dur <= end) {
    times.push(`${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`)
    cur += dur
  }
  return times
}

function periodSlots(all: string[], p: typeof PERIODS[0]) {
  return all.filter((t) => t >= p.from && t < p.to)
}

// ── Searchable doctor picker (shared) ────────────────────────────────────────

function DoctorPicker({ doctors, value, onChange }: {
  doctors:  Doctor[]
  value:    string
  onChange: (id: string) => void
}) {
  const [search, setSearch] = useState("")
  const selected = doctors.find((d) => d.id === value)

  if (doctors.length === 0) {
    return <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3">No doctors yet. Add doctors first.</p>
  }

  const filtered = search.trim()
    ? doctors.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.speciality.toLowerCase().includes(search.toLowerCase())
      )
    : doctors

  return (
    <div className="space-y-2">
      {/* Selected doctor chip */}
      {selected && (
        <div className="rounded-xl border" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-t-xl"
            style={{ background: C.cream, borderBottom: selected.services.length ? `1px solid ${C.border}` : "none" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
              style={{ background: C.primary, color: "#fff" }}>
              {selected.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: C.primary }}>{selected.name}</p>
              <p className="text-xs truncate" style={{ color: "#9A7A5A" }}>{selected.speciality}</p>
            </div>
            <button type="button" onClick={() => { onChange(""); setSearch("") }}
              className="shrink-0 p-1 rounded hover:opacity-70 transition-opacity"
              style={{ color: C.primary }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Services this doctor can perform */}
          {selected.services.length > 0 ? (
            <div className="px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9A7A5A" }}>
                Offers these services
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selected.services.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ background: "#EAF3F5", color: "#3A8A97" }}>
                    {s.name}
                    <span style={{ color: "#9A7A5A" }}>· {s.durationMins}m</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-3 py-2.5">
              <p className="text-xs" style={{ color: "#BF4646" }}>
                ⚠ No services assigned. Go to <strong>Doctors → Edit</strong> to add services to this doctor.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Search + list — hidden once a doctor is selected and search is empty */}
      {(!selected || search) && (
        <div className="space-y-1.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
              style={{ color: "#9A7A5A" }} />
            <Input
              placeholder={`Search ${doctors.length} doctors…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 bg-white text-sm"
              style={{ borderColor: C.border }}
            />
          </div>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: C.border }}>
            <div className="max-h-52 overflow-y-auto divide-y" style={{ borderColor: C.border }}>
              {filtered.length === 0 ? (
                <p className="p-3 text-sm text-center" style={{ color: "#9A7A5A" }}>No doctors match</p>
              ) : filtered.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { onChange(d.id); setSearch("") }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                  style={{ background: value === d.id ? C.cream : "#fff" }}
                  onMouseEnter={(e) => { if (value !== d.id) e.currentTarget.style.background = C.cream }}
                  onMouseLeave={(e) => { if (value !== d.id) e.currentTarget.style.background = "#fff" }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                    style={{
                      background: value === d.id ? C.primary : C.beige,
                      color:      value === d.id ? "#fff"    : C.primary,
                    }}>
                    {d.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{d.name}</p>
                    <p className="text-xs truncate" style={{ color: "#9A7A5A" }}>{d.speciality}</p>
                  </div>
                  {value === d.id && <Check className="w-4 h-4 shrink-0" style={{ color: C.primary }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SlotManager({ doctors }: { doctors: Doctor[] }) {
  return (
    <Tabs defaultValue="create" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="create">Add Availability</TabsTrigger>
        <TabsTrigger value="manage">View Schedule</TabsTrigger>
      </TabsList>
      <TabsContent value="create"><CreateTab doctors={doctors} /></TabsContent>
      <TabsContent value="manage"><ManageTab doctors={doctors} /></TabsContent>
    </Tabs>
  )
}

// ── ADD AVAILABILITY ──────────────────────────────────────────────────────────

function CreateTab({ doctors }: { doctors: Doctor[] }) {
  const [doctorId,   setDoctorId]   = useState("")
  const [serviceId,  setServiceId]  = useState("")
  const [date,       setDate]       = useState<Date | undefined>()
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [savedSlots, setSavedSlots] = useState<Set<string>>(new Set())
  const [fetching,   setFetching]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [justSaved,  setJustSaved]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const doctor  = doctors.find((d) => d.id === doctorId)
  const service = doctor?.services.find((s) => s.id === serviceId)
  const duration = service?.durationMins ?? 30
  const ready    = !!doctorId && !!serviceId && !!date

  const allSlots = generateTimes("06:00", "22:00", duration)

  // Reload saved slots whenever doctor + service + date change
  useEffect(() => {
    setSelected(new Set()); setJustSaved(false); setError(null); setSavedSlots(new Set())
    if (!doctorId || !serviceId || !date) return
    setFetching(true)
    fetch(`/api/slots/by-date?doctorId=${doctorId}&serviceId=${serviceId}&date=${date.toISOString().split("T")[0]}`)
      .then((r) => r.json())
      .then((d) => setSavedSlots(new Set((d.data ?? []).map((s: Slot) => s.startTime))))
      .finally(() => setFetching(false))
  }, [doctorId, serviceId, date])

  // Clear selection when duration changes (service switch)
  useEffect(() => { setSelected(new Set()); setJustSaved(false) }, [duration])

  function toggle(t: string) {
    if (savedSlots.has(t)) return
    setSelected((p) => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n })
  }

  function togglePeriod(period: typeof PERIODS[0]) {
    const slots = periodSlots(allSlots, period).filter((t) => !savedSlots.has(t))
    const allOn = slots.every((t) => selected.has(t))
    setSelected((p) => { const n = new Set(p); slots.forEach((t) => allOn ? n.delete(t) : n.add(t)); return n })
  }

  async function handleSave() {
    if (!ready || selected.size === 0) return
    setLoading(true); setError(null)
    const res = await fetch("/api/slots", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        doctorId,
        serviceId,
        durationMins: duration,
        date:  date!.toISOString().split("T")[0],
        times: Array.from(selected).sort(),
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setSavedSlots((p) => { const n = new Set(p); selected.forEach((t) => n.add(t)); return n })
      setSelected(new Set()); setJustSaved(true)
    } else {
      setError(data.error ?? "Something went wrong.")
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5">

      {/* Step 1 — Doctor */}
      <div className="bg-white rounded-xl border p-5 space-y-3" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: C.primary }}>1</div>
          <p className="text-sm font-semibold text-foreground">Select Doctor</p>
        </div>
        <DoctorPicker
          doctors={doctors}
          value={doctorId}
          onChange={(id) => { setDoctorId(id); setServiceId(""); setSelected(new Set()) }}
        />
      </div>

      {/* Step 2 — Service + Date */}
      <div className={cn("bg-white rounded-xl border p-5 space-y-4 transition-opacity", !doctorId && "opacity-50 pointer-events-none")}
        style={{ borderColor: C.border }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: doctorId ? C.primary : "#ccc" }}>2</div>
          <p className="text-sm font-semibold text-foreground">Choose Service &amp; Date</p>
        </div>

        {/* Service picker */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Service (slots will match this duration)</p>
          {!doctor || doctor.services.length === 0 ? (
            <p className="text-sm rounded-xl border px-4 py-3" style={{ borderColor: C.border, color: C.primary }}>
              ⚠ No services assigned to this doctor. Go to <strong>Doctors → Edit</strong> first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {doctor.services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setServiceId(s.id); setSelected(new Set()) }}
                  className="rounded-xl border px-3 py-2 text-sm font-medium transition-all"
                  style={{
                    background:  serviceId === s.id ? C.primary : "#fff",
                    color:       serviceId === s.id ? "#fff"    : "#444",
                    borderColor: serviceId === s.id ? C.primary : C.border,
                  }}
                >
                  {s.name}
                  <span className="ml-1.5 opacity-70 text-xs">{s.durationMins}m</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Date</p>
          <DatePickerButton
            value={date}
            onChange={(d) => setDate(d)}
            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </div>

        {/* Duration confirmation chip */}
        {service && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
            style={{ background: C.cream, color: "#7A5A3A" }}>
            <span className="font-semibold" style={{ color: C.primary }}>✓</span>
            Each slot will be <strong>{service.durationMins} minutes</strong> long
            — matching the <strong>{service.name}</strong> service duration.
          </div>
        )}
      </div>

      {/* Step 3 — Slot grid */}
      <div className={cn("bg-white rounded-xl border overflow-hidden transition-opacity", !ready && "opacity-40 pointer-events-none")}
        style={{ borderColor: C.border }}>
        <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ background: C.cream, borderColor: C.border }}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: ready ? C.primary : "#ccc" }}>3</div>
          <p className="text-sm font-semibold text-foreground">Select Time Slots</p>
          {ready && (
            <p className="text-xs ml-auto" style={{ color: "#9A7A5A" }}>
              {doctor?.name} · {date && format(date, "dd MMM")}
              {fetching && " · Loading…"}
            </p>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-5 py-2 border-b text-xs" style={{ background: "#FAFAF8", borderColor: C.border }}>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: C.teal }} />
            Already saved
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: C.primary }} />
            Newly selected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border" style={{ borderColor: C.border }} />
            Available
          </span>
        </div>

        {PERIODS.map((period) => {
          const slots = periodSlots(allSlots, period)
          if (slots.length === 0) return null
          const freePeriodSlots = slots.filter((t) => !savedSlots.has(t))
          const allOn = freePeriodSlots.length > 0 && freePeriodSlots.every((t) => selected.has(t))
          return (
            <div key={period.label} className="border-b last:border-0" style={{ borderColor: C.border }}>
              <div className="flex items-center justify-between px-5 py-2.5" style={{ background: "#FAFAF8" }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.primary }}>
                  {period.label}
                  <span className="ml-2 font-normal normal-case text-muted-foreground">{period.from}–{period.to}</span>
                </span>
                {freePeriodSlots.length > 0 && (
                  <button type="button" onClick={() => togglePeriod(period)}
                    className="text-xs font-medium transition-colors hover:underline"
                    style={{ color: C.primary }}>
                    {allOn ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-2">
                {slots.map((t) => {
                  const isSaved = savedSlots.has(t)
                  const isNew   = selected.has(t)
                  return (
                    <button key={t} type="button" onClick={() => toggle(t)}
                      disabled={isSaved}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
                      style={{
                        background:  isSaved ? C.teal    : isNew ? C.primary : "#fff",
                        color:       isSaved ? "#fff"    : isNew ? "#fff"    : "#555",
                        borderColor: isSaved ? C.teal    : isNew ? C.primary : C.border,
                        cursor:      isSaved ? "default" : "pointer",
                      }}>
                      {(isSaved || isNew) && <Check className="w-3 h-3" />}
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="bg-white rounded-xl border px-5 py-4 flex items-center justify-between gap-4"
        style={{ borderColor: C.border }}>
        <div className="text-sm">
          {fetching ? (
            <span className="text-muted-foreground">Loading existing slots…</span>
          ) : justSaved ? (
            <span className="font-medium flex items-center gap-1.5" style={{ color: C.teal }}>
              <Check className="w-4 h-4" /> Slots saved! Select more to add.
            </span>
          ) : savedSlots.size > 0 && selected.size === 0 && ready ? (
            <span className="text-muted-foreground">
              <strong style={{ color: C.teal }}>{savedSlots.size}</strong> slots saved.
              {selected.size === 0 && " Select more to add."}
            </span>
          ) : selected.size > 0 ? (
            <span className="text-foreground">
              <strong style={{ color: C.primary }}>{selected.size}</strong> new slots ready to save
            </span>
          ) : (
            <span className="text-muted-foreground">
              {ready ? "Click slots above to select them" : "Complete steps 1 & 2 first"}
            </span>
          )}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          {selected.size > 0 && (
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}
              style={{ borderColor: C.border }}>Clear</Button>
          )}
          <Button size="sm" disabled={!ready || selected.size === 0 || loading} onClick={handleSave}
            style={{ background: C.primary, color: "#fff" }}>
            {loading ? "Saving…" : `Save ${selected.size || ""} slots`}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── VIEW SCHEDULE ─────────────────────────────────────────────────────────────

function ManageTab({ doctors }: { doctors: Doctor[] }) {
  const [doctorId,  setDoctorId]  = useState("")
  const [date,      setDate]      = useState<Date | undefined>()
  const [slots,     setSlots]     = useState<Slot[]>([])
  const [loading,   setLoading]   = useState(false)
  const [toast,     setToast]     = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const fetchSlots = useCallback(async () => {
    if (!doctorId || !date) return
    setLoading(true)
    const res  = await fetch(`/api/slots/by-date?doctorId=${doctorId}&date=${date.toISOString().split("T")[0]}`)
    const data = await res.json()
    setSlots(data.data ?? [])
    setLoading(false)
  }, [doctorId, date])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  async function deleteSlot(id: string) {
    const res = await fetch(`/api/slots/${id}`, { method: "DELETE" })
    if (res.ok) { setSlots((p) => p.filter((s) => s.id !== id)); showToast("ok", "Slot removed.") }
    else showToast("err", "Can't delete — cancel the appointment first.")
  }

  async function markLeave() {
    const free = slots.filter((s) => !s.isBooked)
    if (!free.length) return
    setLoading(true)
    await Promise.all(free.map((s) => fetch(`/api/slots/${s.id}`, { method: "DELETE" })))
    setSlots((p) => p.filter((s) => s.isBooked))
    showToast("ok", `Marked as leave — ${free.length} slot${free.length !== 1 ? "s" : ""} removed.`)
    setLoading(false)
  }

  function showToast(type: "ok" | "err", text: string) {
    setToast({ type, text }); setTimeout(() => setToast(null), 3000)
  }

  const doctor      = doctors.find((d) => d.id === doctorId)
  const freeCount   = slots.filter((s) => !s.isBooked).length
  const bookedCount = slots.length - freeCount

  return (
    <div className="space-y-5">

      {/* Doctor picker */}
      <div className="bg-white rounded-xl border p-5 space-y-3" style={{ borderColor: C.border }}>
        <p className="text-sm font-semibold text-foreground">Select Doctor</p>
        <DoctorPicker doctors={doctors} value={doctorId}
          onChange={(id) => { setDoctorId(id); setSlots([]) }} />
      </div>

      {/* Date picker */}
      {doctorId && (
        <div className="bg-white rounded-xl border p-5 space-y-3" style={{ borderColor: C.border }}>
          <p className="text-sm font-semibold text-foreground">Select Date</p>
          <DatePickerButton
            value={date}
            onChange={(d) => { setDate(d); setSlots([]) }}
          />
        </div>
      )}

      {/* Schedule */}
      {doctorId && date && (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: C.border }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
            <div>
              <p className="font-semibold text-foreground">{doctor?.name}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{format(date, "EEEE, dd MMMM yyyy")}</p>
            </div>
            {!loading && slots.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: "#E8F5E9", color: "#388E3C" }}>{freeCount} free</span>
                {bookedCount > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: C.tealLight, color: C.teal }}>{bookedCount} booked</span>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : slots.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <CalendarOff className="w-8 h-8 mx-auto mb-3" style={{ color: C.beige }} />
              <p className="text-sm font-medium text-muted-foreground">No slots on this day</p>
              <p className="text-xs text-muted-foreground mt-1">Doctor is unavailable — patients cannot book</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: C.border }}>
              {slots.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#FAFAF8] transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm font-semibold text-foreground">{slot.startTime}</span>
                    <span className="text-xs text-muted-foreground/50">→</span>
                    <span className="font-mono text-xs text-muted-foreground">{slot.endTime}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                      style={slot.isBooked
                        ? { background: C.tealLight, color: C.teal }
                        : { background: "#E8F5E9",   color: "#388E3C" }}>
                      {slot.isBooked ? "Booked" : "Available"}
                    </span>
                  </div>
                  {!slot.isBooked && (
                    <button type="button" onClick={() => deleteSlot(slot.id)}
                      className="p-2 rounded-lg transition-colors text-muted-foreground/50 hover:text-red-400 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && freeCount > 0 && (
            <div className="px-5 py-4 border-t flex items-center justify-between"
              style={{ background: C.cream, borderColor: C.border }}>
              <p className="text-xs text-muted-foreground">Remove all free slots to mark this day as leave.</p>
              <Button size="sm" variant="outline" onClick={markLeave}
                className="shrink-0 ml-4 gap-1.5"
                style={{ borderColor: C.primary, color: C.primary }}>
                <CalendarOff className="w-3.5 h-3.5" /> Mark as leave
              </Button>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50 text-white"
          style={{ background: toast.type === "ok" ? C.teal : C.primary }}>
          {toast.text}
        </div>
      )}
    </div>
  )
}
